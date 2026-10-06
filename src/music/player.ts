// Reprodução musical sincronizada: notas (com duração, pausas, intensidade e articulação),
// metrônomo e acompanhamento de piano, sempre de acordo com a fórmula de compasso e o andamento.
import type { SNote } from '../components/Staff'
import { agora, initAudio, metronomo as clique, soltarTudo, tocar as tocarAgora } from './audio'
import { toneDeMidi, vexParaTone } from './notes'
import { BEATS, acentos, compasso as compassoPorId, duracaoCompasso, valorPulso, type Compasso, type Dur } from './rhythm'

export type Articulacao = 'staccato' | 'acento' | 'fermata' | 'tenuto' | 'legato'

export interface NotaTocada {
  t: number // início, em semínimas
  dur: number // duração, em semínimas
  notas: string[] // nomes Tone.js
  vel?: number // 0–1
  art?: Articulacao
}

export interface OpcoesTocar {
  bpm?: number // pulsos por minuto (no composto, o pulso é a semínima pontuada)
  compasso?: Compasso
  metronomo?: boolean
  subdivisao?: boolean // cliques leves nas colcheias (útil no composto)
  contagem?: boolean // um compasso de contagem antes
  /** cliques de metrônomo explícitos (em semínimas, força 2/1/0/-1); substituem o metrônomo automático */
  cliques?: { t: number; forca: number }[]
  /** volume do metrônomo (0–1) */
  volumeMetronomo?: number
  acompanhamento?: boolean // baixo + acordes marcando os tempos
  tonica?: number // MIDI da tônica do acompanhamento (padrão Dó)
  compassos?: number // total de compassos (para metrônomo/acompanhamento)
}

export interface Agenda {
  inicio: number // relógio de áudio (s) do 1º tempo
  spq: number // segundos por semínima
  fim: number // relógio de áudio (s) do fim
}

/** segundos por semínima a partir do andamento do pulso */
export const segPorSeminima = (bpm: number, c: Compasso) => 60 / bpm / valorPulso(c)

// Agendador com janela de antecedência: os sons são enviados ao Tone.js pouco antes da hora,
// o que permite cancelar uma reprodução quando outra começa (sem sons "fantasmas").
let agendador: ReturnType<typeof setInterval> | null = null
let fila: { t: number; f: (t: number) => void }[] = []

export function pararSom() {
  if (agendador) clearInterval(agendador)
  agendador = null
  fila = []
  soltarTudo()
}

function iniciarAgendador() {
  fila.sort((a, b) => a.t - b.t)
  let i = 0
  const tick = () => {
    const limite = agora() + 0.3
    while (i < fila.length && fila[i].t <= limite) {
      const ev = fila[i++]
      ev.f(Math.max(ev.t, agora() + 0.005))
    }
    if (i >= fila.length && agendador) { clearInterval(agendador); agendador = null }
  }
  tick()
  agendador = setInterval(tick, 40)
}

export async function tocarSequencia(notas: NotaTocada[], o: OpcoesTocar = {}): Promise<Agenda> {
  await initAudio()
  pararSom()
  const tocar = (n: string | string[], d: number, t: number, v?: number) => fila.push({ t, f: (tt) => tocarAgora(n, d, tt, v) })
  const vm = o.volumeMetronomo ?? 1
  const metronomo = (t: number, f: number) => fila.push({ t, f: (tt) => clique(tt, f, vm) })
  const c = o.compasso ?? compassoPorId('4/4')
  const spq = segPorSeminima(o.bpm ?? 80, c)
  const lenC = duracaoCompasso(c)
  const t0 = agora() + 0.15
  const inicio = t0 + (o.contagem ? lenC * spq : 0)

  // notas (com articulações; a fermata alonga a nota e empurra o restante)
  let atraso = 0
  let fimNotas = 0
  for (const nt of [...notas].sort((a, b) => a.t - b.t)) {
    let dur = nt.dur
    let vel = nt.vel ?? 0.75
    if (nt.art === 'staccato') dur = Math.min(dur, 0.25) * 0.8
    if (nt.art === 'acento') vel = Math.min(1, vel + 0.25)
    if (nt.art === 'tenuto' || nt.art === 'legato') dur *= 1.02
    const t = inicio + (nt.t + atraso) * spq
    if (nt.art === 'fermata') {
      atraso += nt.dur
      dur = nt.dur * 2
    }
    tocar(nt.notas, Math.max(0.05, dur * spq * (nt.art === 'staccato' ? 1 : 0.95)), t, vel)
    fimNotas = Math.max(fimNotas, nt.t + atraso + nt.dur)
  }

  const nComp = o.compassos ?? Math.max(1, Math.ceil(fimNotas / lenC - 1e-9))
  const total = nComp * lenC
  const pulso = valorPulso(c)
  const ac = acentos(c)
  const composto = c.tipo === 'composto'

  // contagem: metrônomo de um compasso
  if (o.contagem) ac.forEach((a, i) => metronomo(t0 + i * pulso * spq, a))

  o.cliques?.forEach((c) => metronomo(inicio + c.t * spq, c.forca))
  if (!o.cliques && (o.metronomo || o.subdivisao)) {
    for (let m = 0; m < nComp; m++)
      ac.forEach((a, i) => {
        const tp = inicio + (m * lenC + i * pulso) * spq
        if (o.metronomo) metronomo(tp, a)
        if (o.subdivisao || (o.metronomo && composto)) for (let s = 1; s < (composto ? 3 : 2); s++) metronomo(tp + s * (pulso / (composto ? 3 : 2)) * spq, -1)
      })
  }

  if (o.acompanhamento) {
    const ton = o.tonica ?? 48 // Dó3
    const acorde = [ton + 12 + 4, ton + 12 + 7, ton + 24].map(toneDeMidi)
    for (let m = 0; m < nComp; m++)
      ac.forEach((a, i) => {
        const tp = inicio + (m * lenC + i * pulso) * spq
        // baixo no tempo forte (tônica), meio-forte (quinta); acorde nos demais
        if (a === 2) tocar(toneDeMidi(ton - 12), pulso * spq * 0.9, tp, 0.7)
        else if (a === 1) tocar(toneDeMidi(ton - 5), pulso * spq * 0.9, tp, 0.5)
        else tocar(acorde, pulso * spq * 0.5, tp, 0.3)
        // no composto, o acorde preenche as 2ª e 3ª colcheias do pulso
        if (composto) for (let s = 1; s < 3; s++) tocar(acorde, 0.4 * spq, tp + s * 0.5 * spq, 0.22)
      })
  }

  iniciarAgendador()
  return { inicio, spq, fim: inicio + Math.max(total, fimNotas) * spq }
}

// ───────────── compatibilidade: tocar trechos desenhados (SNote) ─────────────
export interface OpcoesPlay extends OpcoesTocar {
  tempos?: number // tempos por compasso em x/4 (atalho antigo)
  /** exemplos de ritmo: todas as notas soam numa altura fixa (som de piano, não batida) */
  percussao?: boolean
}

export const duracaoBeats = (s: SNote) => BEATS[s.dur as Dur] * (s.dots ? 1.5 : 1)

const VEL_DINAMICA: Record<string, number> = { pp: 0.3, p: 0.42, mp: 0.55, mf: 0.68, f: 0.85, ff: 1 }
const ART_VEX: Record<string, Articulacao> = { 'a.': 'staccato', 'a>': 'acento', 'a@a': 'fermata', 'a@u': 'fermata', 'a-': 'tenuto' }

/** converte compassos desenhados em notas tocáveis */
export function staffParaSom(compassos: SNote[][], alturaFixa?: string): NotaTocada[] {
  const out: NotaTocada[] = []
  let t = 0
  let vel = 0.72
  for (const c of compassos)
    for (const s of c) {
      const d = duracaoBeats(s)
      if (s.dyn && VEL_DINAMICA[s.dyn]) vel = VEL_DINAMICA[s.dyn]
      if (!s.rest) {
        const art = s.artic?.map((a) => ART_VEX[a]).find(Boolean)
        out.push({ t, dur: d, notas: alturaFixa ? [alturaFixa] : s.keys.map(vexParaTone), vel, art })
      }
      t += d
    }
  return out
}

export async function tocarCompassos(compassos: SNote[][], o: OpcoesPlay = {}): Promise<[number, number]> {
  const c = o.compasso ?? compassoPorId(`${o.tempos ?? 4}/4`)
  const ag = await tocarSequencia(staffParaSom(compassos, o.percussao ? 'C5' : undefined), { ...o, compasso: c })
  return [ag.inicio, ag.spq]
}
