// Minigame "Maestro do compasso": reconhecer a fórmula de compasso pelo ouvido
// e sentir a pulsação / o primeiro tempo tocando junto com a música.
import { useEffect, useRef, useState } from 'react'
import MultipleChoice, { type Pergunta } from '../components/MultipleChoice'
import { SeletorAndamento, SeletorCompasso } from '../components/Controles'
import { Pulsos } from './Performance'
import { agora, latencia, metronomo } from '../music/audio'
import { n, rand, shuffle } from '../music/notes'
import { gerarMelodia, melodiaParaSom, melodiaParaStaff } from '../music/melody'
import { tocarSequencia } from '../music/player'
import { COMPASSOS, acentos, compasso, duracaoCompasso, pulsos, valorPulso, type Compasso } from '../music/rhythm'
import { registrar } from '../store'

export const NIVEIS_MAESTRO = ['2/4 ou 3/4 (com metrônomo)', 'Binário, ternário ou quaternário', 'Simples ou composto?', 'Todas as fórmulas']

function gerarPergunta(nivel: number): Pergunta {
  const conjuntos = [['2/4', '3/4'], ['2/4', '3/4', '4/4'], ['3/4', '6/8', '2/4', '9/8'], COMPASSOS.map((c) => c.id)]
  const ids = conjuntos[nivel - 1]
  const c = compasso(rand(ids))
  const mel = gerarMelodia({ compasso: c, nCompassos: 4, nivelRitmo: nivel >= 3 ? 2 : 1, faixa: [n('e/4'), n('c/5')] })
  const ops = nivel === 4 ? shuffle([c.id, ...shuffle(ids.filter((x) => x !== c.id)).slice(0, 3)]) : shuffle([...ids])
  const ac = acentos(c).map((a) => (a === 2 ? 'FORTE' : a === 1 ? 'meio' : 'fraco')).join(' – ')
  return {
    texto: 'Ouça. Em que compasso está esta música?',
    audio: {
      notas: melodiaParaSom(mel).map((x) => ({ ...x, vel: 0.55 })),
      opcoes: { compasso: c, bpm: c.tipo === 'composto' ? 56 : 84, acompanhamento: true, metronomo: nivel === 1, compassos: 4 },
      auto: true, rotulo: 'Ouvir de novo',
    },
    depois: { clef: 'treble', time: c.id, measures: melodiaParaStaff(mel), width: 640, minMeasureWidth: 200, height: 130, y: 10 },
    opcoes: ops, certa: ops.indexOf(c.id), conceito: c.id,
    explica: `${c.id} — ${c.nome}: ${pulsos(c)} pulsos por compasso (${ac}). ${c.tipo === 'composto' ? 'Cada pulso se divide em 3 (balanço "ternário" dentro do tempo).' : 'Cada pulso se divide em 2.'} Procure o baixo grave: ele marca o 1º tempo.`,
  }
}

// ───────────────────────── Sinta a pulsação ─────────────────────────
type Alvo = 'pulsos' | 'tempo1'
const COMPASSOS_PULSO = 4

function SintaPulsacao() {
  const [c, setC] = useState<Compasso>(compasso('3/4'))
  const [bpm, setBpm] = useState(76)
  const [alvo, setAlvo] = useState<Alvo>('tempo1')
  const [fase, setFase] = useState<'parado' | 'tocando' | 'fim'>('parado')
  const [toques, setToques] = useState<number[]>([]) // desvios em ms (positivo = atrasado)
  const [errados, setErrados] = useState(0)
  const clock = useRef({ inicio: 0, spq: 1, raf: 0 })
  const esperados = useRef<{ t: number; ok: boolean }[]>([])
  const faseRef = useRef(fase)
  faseRef.current = fase

  useEffect(() => () => cancelAnimationFrame(clock.current.raf), [])

  async function comecar() {
    setToques([]); setErrados(0)
    const mel = gerarMelodia({ compasso: c, nCompassos: COMPASSOS_PULSO, nivelRitmo: 1, faixa: [n('e/4'), n('c/5')] })
    const ag = await tocarSequencia(melodiaParaSom(mel).map((x) => ({ ...x, vel: 0.5 })), { compasso: c, bpm, contagem: true, acompanhamento: true, compassos: COMPASSOS_PULSO })
    clock.current = { inicio: ag.inicio, spq: ag.spq, raf: 0 }
    const lenC = duracaoCompasso(c)
    const passo = alvo === 'tempo1' ? lenC : valorPulso(c)
    esperados.current = Array.from({ length: Math.round((COMPASSOS_PULSO * lenC) / passo) }, (_, i) => ({ t: i * passo, ok: false }))
    setFase('tocando')
    const loop = () => {
      const b = (agora() - clock.current.inicio) / clock.current.spq
      if (b > COMPASSOS_PULSO * lenC + 0.5) {
        setFase('fim')
        const acertos = esperados.current.filter((e) => e.ok).length
        registrar('maestro-pulso', { acertos, tentativas: esperados.current.length, melhor: Math.round((acertos / esperados.current.length) * 100) })
        return
      }
      clock.current.raf = requestAnimationFrame(loop)
    }
    loop()
  }

  function toque() {
    if (faseRef.current !== 'tocando') return
    const { inicio, spq } = clock.current
    const b = (agora() - latencia() - inicio) / spq
    metronomo(agora(), 1)
    let melhor: { t: number; ok: boolean } | null = null
    let dist = Infinity
    for (const e of esperados.current) if (!e.ok && Math.abs(e.t - b) < dist) { dist = Math.abs(e.t - b); melhor = e }
    const ms = (b - (melhor?.t ?? 0)) * spq * 1000
    if (melhor && Math.abs(ms) <= Math.min(220, spq * valorPulso(c) * 1000 * 0.35)) {
      melhor.ok = true
      setToques((t) => [...t, ms])
    } else setErrados((x) => x + 1)
  }
  const toqueRef = useRef(toque)
  toqueRef.current = toque
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) toqueRef.current() } }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [])

  const total = esperados.current.length
  const media = toques.length ? Math.round(toques.reduce((a, b) => a + b, 0) / toques.length) : 0
  return (
    <div className="exercise">
      <div className="toolbar">
        <SeletorCompasso valor={c} onChange={(cc) => { setC(cc); setBpm(cc.tipo === 'composto' ? 56 : 76) }} disabled={fase === 'tocando'} />
        <SeletorAndamento valor={bpm} onChange={setBpm} disabled={fase === 'tocando'} composto={c.tipo === 'composto'} />
        <div className="seg">
          <button className={alvo === 'tempo1' ? 'on' : ''} disabled={fase === 'tocando'} onClick={() => setAlvo('tempo1')}>Só o tempo 1</button>
          <button className={alvo === 'pulsos' ? 'on' : ''} disabled={fase === 'tocando'} onClick={() => setAlvo('pulsos')}>Todos os pulsos</button>
        </div>
      </div>
      <h2 className="prompt">{fase === 'fim' ? `${toques.length} de ${total} no tempo` : alvo === 'tempo1' ? 'Toque no 1º tempo de cada compasso' : 'Toque em cada pulso'}</h2>
      <p className="muted small center">O metrônomo conta 1 compasso; depois só a música toca. Mantenha a pulsação sozinho. {c.tipo === 'composto' ? `Em ${c.id}, o pulso é a semínima pontuada (${pulsos(c)} por compasso).` : ''}</p>
      {fase === 'tocando' && <Pulsos c={c} clock={clock} />}
      <div className="feedback">
        {fase === 'fim' && (
          <span>
            <span className="ok">{Math.round((toques.length / Math.max(1, total)) * 100)}% dos {alvo === 'tempo1' ? 'tempos fortes' : 'pulsos'}</span>
            {toques.length > 0 && <> · desvio médio {Math.abs(media)} ms {media > 25 ? '(atrasado)' : media < -25 ? '(adiantado)' : '(no tempo)'}</>}
            {errados > 0 && <> · <span className="erro">{errados} toque(s) fora do lugar</span></>}
          </span>
        )}
      </div>
      <div className="row center">
        <button className="btn primary" onClick={comecar} disabled={fase === 'tocando'}>{fase === 'fim' ? 'De novo' : 'Começar'}</button>
      </div>
      <button className={'tap ' + (fase === 'tocando' ? 'live' : '')} onPointerDown={(e) => { e.preventDefault(); toque() }}>TOQUE<small>ou barra de Espaço</small></button>
    </div>
  )
}

export default function Maestro() {
  const [aba, setAba] = useState<'ouvido' | 'pulso'>('ouvido')
  return (
    <div className="exercise">
      <div className="seg">
        <button className={aba === 'ouvido' ? 'on' : ''} onClick={() => setAba('ouvido')}>Qual é o compasso?</button>
        <button className={aba === 'pulso' ? 'on' : ''} onClick={() => setAba('pulso')}>Sinta a pulsação</button>
      </div>
      {aba === 'ouvido' ? <MultipleChoice skill="maestro" niveis={NIVEIS_MAESTRO} gerar={gerarPergunta} /> : <SintaPulsacao />}
    </div>
  )
}
