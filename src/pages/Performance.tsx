// Exercício de ritmo (tocar no tempo) e de melodia com ritmo (tocar no piano no tempo certo).
// Configurável: fórmula de compasso (simples/compostos), 2–10 compassos e andamento.
// As figuras soam como notas de piano (com acompanhamento), respeitando durações e pausas.
import { useEffect, useMemo, useRef, useState } from 'react'
import Staff, { type SNote, type StaffLayout } from '../components/Staff'
import Piano, { type Marca } from '../components/Piano'
import Niveis from '../components/Niveis'
import { SeletorAndamento, SeletorCompasso, SeletorQuantidade } from '../components/Controles'
import { useNivel } from '../hooks/useNivel'
import { agora, initAudio, latencia, tocar } from '../music/audio'
import { midi, n } from '../music/notes'
import { gerarMelodia, melodiaParaSom, melodiaParaStaff, type Melodia } from '../music/melody'
import { tocarSequencia } from '../music/player'
import { acentos, beats, compasso, duracaoCompasso, pulsos, valorPulso, type Compasso } from '../music/rhythm'
import { registrar } from '../store'

type Fase = 'parado' | 'demo' | 'contagem' | 'tocando' | 'fim'
type Res = 'perfeito' | 'quase' | 'errado'
const NOTA_RITMO = n('c/5')
const NIVEIS = ['Figuras longas e semínimas', 'Colcheias e pausas', 'Pontos e semicolcheias']

function gerar(modo: 'ritmo' | 'melodia', nivel: number, c: Compasso, nComp: number): Melodia {
  const faixa: [number, number] = modo === 'ritmo' ? [NOTA_RITMO, NOTA_RITMO] : nivel < 3 ? [n('c/4'), n('g/4')] : [n('c/4'), n('c/5')]
  return gerarMelodia({ compasso: c, nCompassos: nComp, nivelRitmo: nivel, faixa, saltoMax: modo === 'ritmo' ? 0 : 2 })
}

export default function Performance({ modo }: { modo: 'ritmo' | 'melodia' }) {
  const skill = modo
  const lv = useNivel(skill, NIVEIS.length, NIVEIS)
  const [c, setC] = useState<Compasso>(compasso('4/4'))
  const [nComp, setNComp] = useState(2)
  const [bpm, setBpm] = useState(70)
  const [acomp, setAcomp] = useState(true)
  const [guia, setGuia] = useState(false)
  const [ex, setEx] = useState<Melodia>(() => gerar(modo, lv.nivel, c, nComp))
  const [fase, setFase] = useState<Fase>('parado')
  const [res, setRes] = useState<Record<number, Res>>({})
  const [extras, setExtras] = useState(0)
  const [contagem, setContagem] = useState<number | null>(null)
  const [cursor, setCursor] = useState<{ x: number; row: number } | null>(null)
  const [marks, setMarks] = useState<Record<number, Marca>>({})
  const [layout, setLayout] = useState<StaffLayout | null>(null)
  const clock = useRef({ inicio: 0, spq: 1, raf: 0 })
  const resRef = useRef<Record<number, Res>>({})
  const extrasRef = useRef(0)
  const faseRef = useRef<Fase>('parado')
  faseRef.current = fase

  const lenC = duracaoCompasso(ex.compasso)
  const total = ex.figuras.length * lenC
  const sons = useMemo(() => ex.eventos.map((e, i) => ({ e, i })).filter(({ e }) => !e.figura.rest), [ex])

  function novo(nv = lv.nivel, cc = c, nn = nComp) {
    cancelAnimationFrame(clock.current.raf)
    setEx(gerar(modo, nv, cc, nn))
    setFase('parado'); setRes({}); resRef.current = {}; setExtras(0); extrasRef.current = 0; setCursor(null); setContagem(null); setMarks({})
  }

  useEffect(() => () => cancelAnimationFrame(clock.current.raf), [])

  // ── posição do cursor: interpola entre as notas desenhadas do compasso atual
  function posDoBeat(b: number): { x: number; row: number } | null {
    const L = layout
    if (!L) return null
    const m = Math.min(ex.figuras.length - 1, Math.max(0, Math.floor(b / lenC)))
    const pts: [number, number][] = [[m * lenC, L.measureX[m][0]]]
    ex.eventos.filter((e) => e.medida === m).forEach((e) => pts.push([e.inicio, L.noteX[m][e.idx] - 6]))
    pts.push([(m + 1) * lenC, L.measureX[m][1]])
    let x = pts[pts.length - 1][1]
    for (let i = 1; i < pts.length; i++) {
      const [b0, x0] = pts[i - 1], [b1, x1] = pts[i]
      if (b <= b1 && b1 > b0) { x = x0 + ((Math.max(b, b0) - b0) / (b1 - b0)) * (x1 - x0); break }
    }
    return { x, row: L.measureRow[m] }
  }

  function loop(onFim: () => void) {
    const { inicio, spq } = clock.current
    const b = (agora() - inicio) / spq
    if (b < 0) setContagem(Math.floor((b + lenC) / valorPulso(ex.compasso)) + 1)
    else { setContagem(null); if (faseRef.current === 'contagem') setFase('tocando') }
    setCursor(b >= 0 ? posDoBeat(b) : null)
    if (b > total + 0.3) { setCursor(null); onFim(); return }
    clock.current.raf = requestAnimationFrame(() => loop(onFim))
  }

  async function agendar(demo: boolean) {
    await initAudio()
    cancelAnimationFrame(clock.current.raf)
    const notas = demo || guia ? melodiaParaSom(ex).map((x) => ({ ...x, vel: demo ? 0.8 : 0.35 })) : []
    const ag = await tocarSequencia(notas, { compasso: ex.compasso, bpm, contagem: true, metronomo: true, acompanhamento: acomp, compassos: ex.figuras.length })
    clock.current = { inicio: ag.inicio, spq: ag.spq, raf: 0 }
  }

  function limpar() { setRes({}); resRef.current = {}; setExtras(0); extrasRef.current = 0; setMarks({}) }

  async function ouvir() {
    if (fase === 'contagem' || fase === 'tocando') return
    limpar()
    setFase('demo')
    await agendar(true)
    loop(() => setFase('parado'))
  }

  async function comecar() {
    limpar()
    setFase('contagem')
    await agendar(false)
    loop(finalizar)
  }

  function finalizar() {
    const r = { ...resRef.current }
    sons.forEach(({ i }) => { if (!r[i]) r[i] = 'errado' })
    resRef.current = r
    setRes(r)
    setFase('fim')
  }

  // ── toque do aluno
  function toque(nota?: number) {
    const f = faseRef.current
    if (f !== 'contagem' && f !== 'tocando') return
    const { inicio, spq } = clock.current
    const b = (agora() - latencia() - inicio) / spq
    if (b < -0.5) return
    let melhor: { e: (typeof sons)[number]['e']; i: number } | null = null
    let dist = Infinity
    for (const s of sons) {
      if (resRef.current[s.i]) continue
      const d = Math.abs(s.e.inicio - b)
      if (d < dist) { dist = d; melhor = s }
    }
    const ms = dist * spq * 1000
    const limite = Math.min(260, spq * 1000 * 0.45)
    if (modo === 'ritmo') tocar('C5', melhor && ms <= limite ? Math.max(0.12, beats(melhor.e.figura) * spq * 0.9) : 0.15, undefined, 0.8)
    if (!melhor || ms > limite) {
      extrasRef.current++
      setExtras(extrasRef.current)
      return
    }
    let r: Res = ms <= 90 ? 'perfeito' : 'quase'
    if (modo === 'melodia' && nota !== undefined && melhor.e.pitch && nota !== midi(melhor.e.pitch.d) + melhor.e.pitch.acc) {
      r = 'errado'
      setMarks({ [nota]: 'erro' })
    } else if (nota !== undefined) setMarks({ [nota]: 'ok' })
    resRef.current = { ...resRef.current, [melhor.i]: r }
    setRes(resRef.current)
  }
  const toqueRef = useRef(toque)
  toqueRef.current = toque

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.code === 'Space' && modo === 'ritmo') { e.preventDefault(); if (!e.repeat) toqueRef.current() }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [modo])

  // ── pontuação
  const nP = Object.values(res).filter((x) => x === 'perfeito').length
  const nQ = Object.values(res).filter((x) => x === 'quase').length
  const nE = Object.values(res).filter((x) => x === 'errado').length
  const precisao = sons.length ? Math.max(0, Math.round((100 * (nP + 0.6 * nQ)) / (sons.length + extras * 0.5))) : 0
  useEffect(() => {
    if (fase !== 'fim') return
    registrar(skill, { melhor: precisao, acertos: nP + nQ, tentativas: sons.length })
    lv.registrarNivel(precisao >= 80)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase])

  const COR: Record<Res, string> = { perfeito: '#16a34a', quase: '#d97706', errado: '#dc2626' }
  const measures: SNote[][] = melodiaParaStaff(ex, (i) => (res[i] ? COR[res[i]] : undefined))

  const ativo = fase === 'contagem' || fase === 'tocando'
  const W = 640
  const rowY = cursor && layout ? layout.rowY[cursor.row] : null
  return (
    <div className="exercise">
      <Niveis nomes={NIVEIS} nivel={lv.nivel} max={lv.max} progresso={lv.progresso} disabled={ativo} onChange={(nv) => { lv.setNivel(nv); novo(nv) }} />
      <div className="toolbar">
        <SeletorCompasso valor={c} disabled={ativo} onChange={(cc) => { setC(cc); setBpm(cc.tipo === 'composto' ? 50 : 70); novo(lv.nivel, cc) }} />
        <SeletorQuantidade valor={nComp} disabled={ativo} onChange={(q) => { setNComp(q); novo(lv.nivel, c, q) }} />
        <SeletorAndamento valor={bpm} disabled={ativo} onChange={setBpm} composto={c.tipo === 'composto'} />
      </div>
      <div className="toolbar">
        <label className="check"><input type="checkbox" checked={acomp} disabled={ativo} onChange={(e) => setAcomp(e.target.checked)} /> Acompanhamento</label>
        <label className="check"><input type="checkbox" checked={guia} disabled={ativo} onChange={(e) => setGuia(e.target.checked)} /> Tocar a guia junto</label>
      </div>
      <div className="muted small center">
        {ex.compasso.id} · {ex.compasso.nome} · {ex.figuras.length} compassos · {pulsos(ex.compasso)} pulsos por compasso
      </div>
      <h2 className="prompt">
        {fase === 'contagem' ? <span className="count">{contagem ?? ''}</span>
          : fase === 'tocando' ? (modo === 'ritmo' ? 'Toque!' : 'Toque as notas no tempo!')
          : fase === 'fim' ? `Precisão: ${precisao}%`
          : modo === 'ritmo' ? 'Toque este ritmo no tempo certo' : 'Toque esta melodia no tempo certo'}
      </h2>
      {fase === 'tocando' || fase === 'contagem' ? <Pulsos c={ex.compasso} clock={clock} /> : null}
      <div className="staff-box">
        <Staff clef="treble" time={ex.compasso.id} measures={measures} width={W} height={130} y={10} minMeasureWidth={c.tipo === 'composto' ? 190 : 170} onLayout={setLayout}>
          {cursor !== null && rowY && layout && (
            <div className="cursor" style={{ left: `${(cursor.x / layout.width) * 100}%`, top: `${(rowY[0] / layout.height) * 100}%`, height: `${((rowY[1] - rowY[0]) / layout.height) * 100}%` }} />
          )}
        </Staff>
      </div>
      <div className="feedback">
        {fase === 'fim' ? (
          <span>
            <span className="ok">{nP} no tempo</span> · <span className="warn">{nQ} quase</span> · <span className="erro">{nE} erradas/perdidas</span>
            {extras > 0 && <> · <span className="muted">{extras} toque(s) a mais</span></>}
            {precisao < 80 && <span className="explica"> Dica: diminua o andamento e conte os pulsos em voz alta.</span>}
          </span>
        ) : <span className="muted">O metrônomo conta 1 compasso antes de começar.</span>}
      </div>
      <div className="row center">
        <button className="btn" onClick={ouvir} disabled={ativo}>▶ Ouvir</button>
        <button className="btn primary" onClick={comecar} disabled={ativo || fase === 'demo'}>{fase === 'fim' ? 'Tentar de novo' : 'Começar'}</button>
        <button className="btn" onClick={() => novo()} disabled={ativo}>Novo exercício</button>
      </div>
      {modo === 'ritmo' ? (
        <button className={'tap ' + (ativo ? 'live' : '')} onPointerDown={(e) => { e.preventDefault(); toque() }}>
          TOQUE<small>ou barra de Espaço</small>
        </button>
      ) : (
        <Piano from={60} to={72} marks={marks} onNote={(m) => toque(m)} />
      )}
      <p className="muted small center">Verde = no tempo (±90 ms) · Amarelo = quase · Vermelho = errou ou não tocou. Use fones com fio para menos atraso.</p>
    </div>
  )
}

/** indicador visual dos pulsos do compasso (o 1º tempo é destacado) */
export function Pulsos({ c, clock }: { c: Compasso; clock: React.RefObject<{ inicio: number; spq: number }> }) {
  const [atual, setAtual] = useState(-1)
  useEffect(() => {
    let raf = 0
    const f = () => {
      const { inicio, spq } = clock.current!
      const b = (agora() - inicio) / spq
      const lenC = duracaoCompasso(c)
      const pos = ((b % lenC) + lenC) % lenC
      setAtual(Math.floor(pos / valorPulso(c)))
      raf = requestAnimationFrame(f)
    }
    raf = requestAnimationFrame(f)
    return () => cancelAnimationFrame(raf)
  }, [c, clock])
  const ac = acentos(c)
  return (
    <div className="pulsos" aria-hidden>
      {ac.map((a, i) => <span key={i} className={`pulso f${a} ${i === atual ? 'on' : ''}`}>{i + 1}</span>)}
    </div>
  )
}
