// Leitura de melodias completas: o aluno nomeia as notas em sequência.
// Três modos: livre (sem tempo) → sequencial (tempo por nota) → primeira vista (no andamento).
import { useEffect, useRef, useState } from 'react'
import Staff, { type StaffLayout } from '../components/Staff'
import Niveis from '../components/Niveis'
import RespostaNota from '../components/RespostaNota'
import { SeletorAndamento } from '../components/Controles'
import { Pulsos } from './Performance'
import { useNivel } from '../hooks/useNivel'
import { agora, initAudio, tocar } from '../music/audio'
import { armadura, n, nomeP, rand, toneNameP, type Acc, type Clef } from '../music/notes'
import { gerarMelodia, melodiaParaSom, melodiaParaStaff, type Melodia } from '../music/melody'
import { tocarSequencia } from '../music/player'
import { compasso, duracaoCompasso, type Figura } from '../music/rhythm'
import { registrar } from '../store'

interface Config { nome: string; comps: string[]; n: number; ritmo: number; faixa: [string, string]; keys?: string[]; acid?: boolean; fixa?: Figura }
export const NIVEIS_MELODIA: Config[] = [
  { nome: 'Sequências curtas (4 notas)', comps: ['4/4'], n: 1, ritmo: 1, faixa: ['c/4', 'g/4'], fixa: { dur: 'q' } },
  { nome: 'Melodias de 2 compassos', comps: ['4/4', '3/4'], n: 2, ritmo: 1, faixa: ['c/4', 'c/5'] },
  { nome: 'Pausas e novas fórmulas', comps: ['2/4', '3/4', '4/4'], n: 2, ritmo: 2, faixa: ['a/3', 'e/5'] },
  { nome: 'Com armadura de clave', comps: ['3/4', '4/4', '6/8'], n: 3, ritmo: 2, faixa: ['c/4', 'e/5'], keys: ['G', 'F', 'D', 'Bb'] },
  { nome: 'Acidentes e compassos compostos', comps: ['2/4', '3/4', '4/4', '6/8', '9/8'], n: 4, ritmo: 3, faixa: ['a/3', 'g/5'], keys: ['C', 'G', 'F', 'D', 'Bb', 'A', 'Eb'], acid: true },
]
type Modo = 'livre' | 'sequencial' | 'vista'
const MODOS: { id: Modo; nome: string; requer: number }[] = [
  { id: 'livre', nome: 'Livre (sem tempo)', requer: 1 },
  { id: 'sequencial', nome: 'Sequencial (tempo por nota)', requer: 3 },
  { id: 'vista', nome: 'Primeira vista (no andamento)', requer: 5 },
]
type Res = 'ok' | 'erro' | 'perdida'
const OFFSET_FA = 10 // desloca a faixa para caber na clave de Fá

export function gerarLeitura(nivel: number, clef: Clef): Melodia {
  const cf = NIVEIS_MELODIA[nivel - 1]
  const off = clef === 'bass' ? OFFSET_FA : 0
  return gerarMelodia({
    compasso: compasso(rand(cf.comps)), nCompassos: cf.n, nivelRitmo: cf.ritmo,
    faixa: [n(cf.faixa[0]) - off, n(cf.faixa[1]) - off],
    armadura: cf.keys ? armadura(rand(cf.keys)) : undefined, acidentes: cf.acid, figuraFixa: cf.fixa,
  })
}

export default function LeituraMelodias() {
  const nomes = NIVEIS_MELODIA.map((x) => x.nome)
  const lv = useNivel('melodias', nomes.length, nomes)
  const [clef, setClef] = useState<Clef>('treble')
  const [modo, setModo] = useState<Modo>('livre')
  const [bpm, setBpm] = useState(50)
  const [mel, setMel] = useState<Melodia>(() => gerarLeitura(lv.nivel, 'treble'))
  const [pos, setPos] = useState(0) // índice na lista de notas (sem pausas)
  const [res, setRes] = useState<Record<number, Res>>({})
  const [erros, setErros] = useState(0)
  const [marca, setMarca] = useState<{ grau: number; tipo: 'certo' | 'errado' } | null>(null)
  const [fase, setFase] = useState<'pronto' | 'tocando' | 'fim'>('pronto')
  const [restante, setRestante] = useState(1)
  const [, setLayout] = useState<StaffLayout | null>(null)
  const clock = useRef({ inicio: 0, spq: 1, raf: 0 })
  const posRef = useRef(0)
  posRef.current = pos
  const resRef = useRef<Record<number, Res>>({})
  resRef.current = res

  const sons = mel.eventos.map((e, i) => ({ e, i })).filter(({ e }) => e.pitch)
  const fim = fase === 'fim'
  const acidentes = lv.nivel >= 4

  function novo(nv = lv.nivel, cl = clef) {
    cancelAnimationFrame(clock.current.raf)
    setMel(gerarLeitura(nv, cl))
    setPos(0); setRes({}); setErros(0); setMarca(null); setFase('pronto'); setRestante(1)
  }
  useEffect(() => () => cancelAnimationFrame(clock.current.raf), [])

  function concluir(r: Record<number, Res>, errosExtra: number) {
    cancelAnimationFrame(clock.current.raf)
    setFase('fim')
    const ok = Object.values(r).filter((x) => x === 'ok').length
    const tent = sons.length + errosExtra
    registrar('melodias', { acertos: ok, tentativas: tent, melhor: Math.round((ok / tent) * 100) })
    lv.registrarNivel(ok / tent >= 0.8)
  }

  function marcar(i: number, r: Res) {
    const novoRes = { ...resRef.current, [sons[i].i]: r }
    resRef.current = novoRes
    setRes(novoRes)
    return novoRes
  }

  function avancar(novoRes: Record<number, Res>, errosAgora = erros) {
    const np = posRef.current + 1
    posRef.current = np
    setPos(np)
    if (np >= sons.length) concluir(novoRes, errosAgora)
  }

  // ── resposta do aluno
  function responder(g: number, acc: Acc) {
    if (fim || pos >= sons.length) return
    if (modo !== 'livre' && fase !== 'tocando') return
    const p = sons[pos].e.pitch!
    const certo = (p.d % 7 + 7) % 7 === g && p.acc === acc
    setMarca({ grau: g, tipo: certo ? 'certo' : 'errado' })
    setTimeout(() => setMarca(null), 400)
    if (certo) tocar(toneNameP(p), '8n')
    if (modo === 'livre') {
      if (certo) avancar(marcar(pos, resRef.current[sons[pos].i] === 'erro' ? 'erro' : 'ok'))
      else { marcar(pos, 'erro'); setErros((x) => x + 1) }
      return
    }
    if (modo === 'sequencial') {
      avancar(marcar(pos, certo ? 'ok' : 'erro'))
      iniciarTimer()
      return
    }
    // primeira vista: responde a nota atual (uma tentativa)
    if (!resRef.current[sons[pos].i]) marcar(pos, certo ? 'ok' : 'erro')
  }

  // ── modo sequencial: tempo limite por nota
  const limite = Math.max(1.6, 5 - lv.nivel * 0.6)
  function iniciarTimer() {
    cancelAnimationFrame(clock.current.raf)
    const t0 = performance.now()
    const p0 = posRef.current
    const f = () => {
      if (posRef.current !== p0 || posRef.current >= sons.length) return
      const frac = 1 - (performance.now() - t0) / (limite * 1000)
      setRestante(Math.max(0, frac))
      if (frac <= 0) { avancar(marcar(p0, 'perdida')); iniciarTimer(); return }
      clock.current.raf = requestAnimationFrame(f)
    }
    clock.current.raf = requestAnimationFrame(f)
  }

  async function comecar() {
    setPos(0); posRef.current = 0; setRes({}); resRef.current = {}; setErros(0)
    setFase('tocando')
    if (modo === 'sequencial') { iniciarTimer(); return }
    // primeira vista: metrônomo; cada nota precisa ser respondida antes da próxima
    await initAudio()
    const ag = await tocarSequencia([], { compasso: mel.compasso, bpm, contagem: true, metronomo: true, compassos: mel.figuras.length })
    clock.current = { inicio: ag.inicio, spq: ag.spq, raf: 0 }
    const total = mel.figuras.length * duracaoCompasso(mel.compasso)
    const loop = () => {
      const b = (agora() - clock.current.inicio) / clock.current.spq
      // nota "atual": a última que já começou (com folga de ¼ de tempo para antecipar)
      let idx = 0
      sons.forEach(({ e }, k) => { if (e.inicio - 0.25 <= b) idx = k })
      if (b >= -0.25 && idx !== posRef.current) {
        if (!resRef.current[sons[posRef.current].i]) marcar(posRef.current, 'perdida')
        posRef.current = idx
        setPos(idx)
      }
      if (b > total) {
        const r = { ...resRef.current }
        sons.forEach(({ i }) => { if (!r[i]) r[i] = 'perdida' })
        resRef.current = r
        setRes(r)
        setPos(sons.length)
        concluir(r, 0)
        return
      }
      clock.current.raf = requestAnimationFrame(loop)
    }
    loop()
  }

  const COR: Record<Res, string> = { ok: '#16a34a', erro: '#dc2626', perdida: '#d97706' }
  const indiceAtual = sons[pos]?.i
  const measures = melodiaParaStaff(
    mel,
    (i) => (res[i] && (fim || i !== indiceAtual) ? COR[res[i]] : i === indiceAtual && !fim && (modo === 'livre' || fase === 'tocando') ? '#2563eb' : undefined),
    (i) => (fim && mel.eventos[i].pitch ? nomeP(mel.eventos[i].pitch!) : undefined),
  )
  const ok = Object.values(res).filter((x) => x === 'ok').length
  const tent = sons.length + erros

  return (
    <div className="exercise">
      <Niveis nomes={nomes} nivel={lv.nivel} max={lv.max} progresso={lv.progresso} disabled={fase === 'tocando' && modo !== 'livre'} onChange={(nv) => { lv.setNivel(nv); novo(nv) }} />
      <div className="toolbar">
        <div className="seg">
          {MODOS.map((m) => (
            <button key={m.id} className={modo === m.id ? 'on' : ''} disabled={lv.max < m.requer || (fase === 'tocando' && modo !== 'livre')} title={lv.max < m.requer ? `Desbloqueia no nível ${m.requer}` : ''} onClick={() => { setModo(m.id); novo() }}>
              {m.nome}
            </button>
          ))}
        </div>
        <div className="seg">
          <button className={clef === 'treble' ? 'on' : ''} onClick={() => { setClef('treble'); novo(lv.nivel, 'treble') }}>Clave de Sol</button>
          <button className={clef === 'bass' ? 'on' : ''} onClick={() => { setClef('bass'); novo(lv.nivel, 'bass') }}>Clave de Fá</button>
        </div>
        {modo === 'vista' && <SeletorAndamento valor={bpm} onChange={setBpm} disabled={fase === 'tocando'} composto={mel.compasso.tipo === 'composto'} />}
      </div>
      <div className="muted small center">
        {mel.compasso.id}{mel.armadura && mel.armadura.qtd ? ` · ${mel.armadura.maior}` : ''} · {sons.length} notas
        {lv.max < 5 && ' · os modos sequencial e primeira vista são desbloqueados nos níveis 3 e 5'}
      </div>
      <h2 className="prompt">{fim ? `Você acertou ${ok} de ${sons.length}` : modo === 'livre' || fase === 'tocando' ? 'Qual é a nota azul?' : 'Pronto para ler?'}</h2>
      {modo === 'vista' && fase === 'tocando' && <Pulsos c={mel.compasso} clock={clock} />}
      {modo === 'sequencial' && fase === 'tocando' && <div className="progress timer"><div style={{ width: `${restante * 100}%` }} /></div>}
      <div className="staff-box">
        <Staff clef={clef} time={mel.compasso.id} keySig={mel.armadura?.vex ?? null} measures={measures} width={640} height={140} y={15} minMeasureWidth={200} onLayout={setLayout} />
      </div>
      <div className="feedback">
        {fim ? (
          <span>{erros > 0 && <span className="erro">{erros} tentativa(s) errada(s) · </span>}<span className="ok">Precisão {Math.round((ok / Math.max(1, tent)) * 100)}%</span>{mel.armadura?.qtd ? <span className="explica"> Lembre-se: a armadura ({mel.armadura.maior}) vale para todas as oitavas.</span> : null}</span>
        ) : <span className="muted">{modo === 'livre' ? 'Sem limite de tempo. Responda com os botões ou as teclas 1–7.' : modo === 'sequencial' ? `Você tem ${limite.toFixed(1)} s por nota.` : 'A nota atual muda no andamento: responda antes da próxima.'}</span>}
      </div>
      {!fim && (modo === 'livre' || fase === 'tocando') && <RespostaNota onResposta={responder} acidentes={acidentes} marcar={marca} />}
      <div className="row center">
        {modo !== 'livre' && fase === 'pronto' && <button className="btn primary" onClick={comecar}>Começar</button>}
        {(modo === 'livre' || fim) && <button className="btn" onClick={() => tocarSequencia(melodiaParaSom(mel), { compasso: mel.compasso, bpm: 70 })}>▶ Ouvir a melodia</button>}
        <button className="btn" onClick={() => novo()}>{fim ? 'Nova melodia' : 'Outra melodia'}</button>
      </div>
    </div>
  )
}

