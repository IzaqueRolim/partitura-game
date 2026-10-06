// Áudio com Tone.js: piano gravado (Salamander Grand Piano, 3 camadas de intensidade),
// metrônomo e efeitos. Se os samples não carregarem, cai para um sintetizador.
//
// O Tone.js é carregado só no primeiro clique/tecla (import dinâmico):
// navegadores bloqueiam AudioContext criado antes de um gesto do usuário.
import type * as ToneNS from 'tone'

type ToneLib = typeof ToneNS
let Tone: ToneLib | null = null
let synth: ToneNS.PolySynth | null = null
let click: ToneNS.PolySynth | null = null
let wood: ToneNS.MembraneSynth | null = null
let saida: ToneNS.ToneAudioNode | null = null
let started: Promise<void> | null = null

// Piano de verdade: Salamander Grand Piano (Yamaha C5 gravado), 3 camadas de intensidade
// (suave, média, forte), arquivos em public/piano — funcionam offline e no app (Capacitor).
type Camada = 'v4' | 'v8' | 'v13'
const camadas: Partial<Record<Camada, ToneNS.Sampler>> = {}
export type EstadoPiano = 'carregando' | 'pronto' | 'sintetizador'
let estado: EstadoPiano = 'carregando'
export const estadoPiano = () => estado
function definirEstado(e: EstadoPiano) {
  estado = e
  window.dispatchEvent(new CustomEvent('partitura:piano', { detail: e }))
}

export function initAudio(): Promise<void> {
  if (started) return started
  started = (async () => {
    const T = await import('tone')
    await T.start()
    T.getContext().lookAhead = 0.02
    // cadeia de saída: reverberação de sala + compressor suave + limitador (acordes sem distorção)
    const limiter = new T.Limiter(-1).toDestination()
    const comp = new T.Compressor({ threshold: -20, ratio: 3, attack: 0.01, release: 0.25 }).connect(limiter)
    const reverb = new T.Reverb({ decay: 2.4, preDelay: 0.012, wet: 0.17 }).connect(comp)
    saida = reverb
    synth = new T.PolySynth(T.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.4, sustain: 0.15, release: 0.8 },
    }).connect(reverb)
    synth.volume.value = -8
    // polifônico: aceita cliques agendados fora de ordem (contagem + metrônomo + toques)
    click = new T.PolySynth(T.Synth, {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
    }).toDestination()
    click.maxPolyphony = 24
    click.volume.value = -18
    wood = new T.MembraneSynth({ pitchDecay: 0.01, octaves: 2, envelope: { attack: 0.001, decay: 0.15, sustain: 0 } }).toDestination()
    wood.volume.value = -6
    Tone = T
    // camada média primeiro (já dá para tocar); as outras carregam em seguida
    carregarCamada(T, 'v8').then(() => Promise.all([carregarCamada(T, 'v4'), carregarCamada(T, 'v13')]))
  })()
  started.catch(() => (started = null)) // permite tentar de novo no próximo gesto
  return started
}

function carregarCamada(T: ToneLib, c: Camada): Promise<void> {
  const urls: Record<string, string> = {}
  for (let o = 0; o <= 8; o++) {
    if (o >= 1) urls[`C${o}`] = `C${o}${c}.mp3`
    if (o >= 1 && o <= 7) {
      urls[`D#${o}`] = `Ds${o}${c}.mp3`
      urls[`F#${o}`] = `Fs${o}${c}.mp3`
    }
    if (o <= 7) urls[`A${o}`] = `A${o}${c}.mp3`
  }
  return new Promise((resolve) => {
    try {
      const s = new T.Sampler({
        urls,
        baseUrl: `${import.meta.env.BASE_URL}piano/`,
        release: 1.1,
        curve: 'exponential',
        onload: () => {
          camadas[c] = s
          if (c === 'v8') definirEstado('pronto')
          resolve()
        },
        onerror: () => {
          s.dispose()
          if (c === 'v8') definirEstado('sintetizador')
          resolve()
        },
      }).connect(saida!)
      s.volume.value = c === 'v4' ? 2 : c === 'v13' ? -2 : 0
    } catch {
      if (c === 'v8') definirEstado('sintetizador')
      resolve()
    }
  })
}

/** escolhe a camada pela intensidade (com fallback para a camada média) */
function instrumento(vel: number): ToneNS.Sampler | ToneNS.PolySynth | null {
  const c: Camada = vel < 0.5 ? 'v4' : vel > 0.8 ? 'v13' : 'v8'
  return camadas[c] ?? camadas.v8 ?? synth
}

type Time = ToneNS.Unit.Time

/** toca uma nota (ex.: "C4") agora ou num tempo agendado; vel = intensidade 0–1 */
export function tocar(nota: string | string[], dur: Time = '4n', time?: number, vel = 0.75) {
  const v = Math.max(0.05, Math.min(1, vel))
  // a camada já muda o timbre; o ganho ajusta o volume dentro dela
  const ganho = 0.45 + 0.55 * v
  const inst = instrumento(v)
  if (!inst) {
    initAudio().then(() => instrumento(v)?.triggerAttackRelease(nota, dur, time, ganho))
    return
  }
  inst.triggerAttackRelease(nota, dur, time, ganho)
}

/** clique do metrônomo: força 2 = 1º tempo, 1 = meio-forte, 0 = fraco, -1 = subdivisão */
export function metronomo(time: number, forca: boolean | number, volume = 1) {
  const f = typeof forca === 'boolean' ? (forca ? 2 : 0) : forca
  const nota = f === 2 ? 'C6' : f === 1 ? 'A5' : f === 0 ? 'G5' : 'D5'
  const vel = f === 2 ? 1 : f === 1 ? 0.75 : f === 0 ? 0.6 : 0.3
  if (volume > 0) click?.triggerAttackRelease(nota, '32n', time, vel * volume)
}

/** som percussivo para demonstrar ritmos */
export function batida(time: number) {
  try {
    wood?.triggerAttackRelease('C4', '16n', time)
  } catch {
    /* sintetizador monofônico: ignora toques fora de ordem */
  }
}

/** interrompe as notas que estão soando */
export function soltarTudo() {
  Object.values(camadas).forEach((c) => c?.releaseAll())
  synth?.releaseAll()
}

/** relógio de áudio (segundos) */
export const agora = () => (Tone ? Tone.immediate() : performance.now() / 1000)

/** latência estimada de saída do áudio (segundos) */
export function latencia(): number {
  if (!Tone) return 0
  const c = Tone.getContext().rawContext as AudioContext
  return (c.outputLatency || 0) + (c.baseLatency || 0)
}
