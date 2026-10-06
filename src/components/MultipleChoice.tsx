// Motor genérico de perguntas de múltipla escolha, usado por quase todas as atividades:
// pentagrama opcional, áudio opcional, opções em texto ou em pentagrama, seleção múltipla,
// feedback imediato com explicação, níveis progressivos e envio de erros para a revisão.
import { useCallback, useEffect, useRef, useState } from 'react'
import Staff, { type StaffProps } from './Staff'
import Niveis from './Niveis'
import { useNivel } from '../hooks/useNivel'
import { tocarSequencia, type NotaTocada, type OpcoesTocar } from '../music/player'
import { responder } from '../store'

export interface Pergunta {
  texto: string
  staff?: StaffProps
  /** pentagrama mostrado depois da resposta (ex.: compasso completado) */
  depois?: StaffProps
  audio?: { notas: NotaTocada[]; opcoes?: OpcoesTocar; auto?: boolean; rotulo?: string }
  /** áudio extra para comparar depois da resposta (ex.: a resposta certa) */
  audioResposta?: { notas: NotaTocada[]; opcoes?: OpcoesTocar }
  opcoes: string[]
  opcoesStaff?: StaffProps[]
  certa: number | number[]
  multi?: boolean
  explica: string
  conceito?: string
}

interface Props {
  skill: string
  gerar?: (nivel: number) => Pergunta
  niveis?: string[]
  /** perguntas fixas (revisão, desafio). Quando acabam, chama onFim */
  fixas?: Pergunta[]
  onFim?: (acertos: number, total: number) => void
  onResposta?: (certo: boolean, p: Pergunta) => void
  /** não registra no histórico (quem usa registra por conta própria) */
  semRegistro?: boolean
  topo?: (nivel: number) => React.ReactNode
  aposResposta?: (p: Pergunta, certo: boolean) => React.ReactNode
}

const certas = (p: Pergunta) => (Array.isArray(p.certa) ? p.certa : [p.certa])

export default function MultipleChoice({ skill, gerar, niveis, fixas, onFim, onResposta, semRegistro, topo, aposResposta }: Props) {
  const lv = useNivel(skill, niveis?.length ?? 1, niveis)
  const nivel = niveis ? lv.nivel : 1
  const [idx, setIdx] = useState(0)
  const [p, setP] = useState<Pergunta>(() => (fixas ? fixas[0] : gerar!(nivel)))
  const [sel, setSel] = useState<number[]>([])
  const [respondida, setRespondida] = useState(false)
  const [s, setS] = useState({ ok: 0, total: 0, seq: 0 })
  const [fim, setFim] = useState(false)
  const nivelRef = useRef(nivel)
  nivelRef.current = nivel

  const ouvir = useCallback((q: Pergunta = p) => {
    if (q.audio) tocarSequencia(q.audio.notas, q.audio.opcoes)
  }, [p])

  // troca manual de nível: nova pergunta já no nível escolhido
  function trocarNivel(n: number) {
    lv.setNivel(n)
    nivelRef.current = n
    setSel([])
    setRespondida(false)
    if (gerar) setP(gerar(n))
  }

  // toca automaticamente quando a pergunta é auditiva
  useEffect(() => {
    if (p.audio?.auto) {
      const t = setTimeout(() => ouvir(p), 250)
      return () => clearTimeout(t)
    }
  }, [p, ouvir])

  function nova() {
    setSel([])
    setRespondida(false)
    if (fixas) {
      const i = idx + 1
      if (i >= fixas.length) {
        setFim(true)
        return
      }
      setIdx(i)
      setP(fixas[i])
    } else setP(gerar!(nivelRef.current))
  }

  function confirmar(escolha: number[]) {
    if (respondida || !escolha.length) return
    const c = certas(p)
    const certo = escolha.length === c.length && c.every((x) => escolha.includes(x))
    setSel(escolha)
    setRespondida(true)
    const ns = { ok: s.ok + (certo ? 1 : 0), total: s.total + 1, seq: certo ? s.seq + 1 : 0 }
    setS(ns)
    if (!semRegistro) responder(skill, certo, p)
    if (niveis && !fixas) lv.registrarNivel(certo)
    onResposta?.(certo, p)
    if (fixas && idx === fixas.length - 1) onFim?.(ns.ok, ns.total)
  }

  function clicar(i: number) {
    if (respondida) return
    if (p.multi) setSel((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]))
    else confirmar([i])
  }

  // atalhos: 1–9 escolhem, Enter confirma / avança, R repete o áudio
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      const k = Number(e.key)
      if (k >= 1 && k <= p.opcoes.length) clicar(k - 1)
      else if (e.key === 'Enter') respondida ? nova() : p.multi && confirmar(sel)
      else if (e.key.toLowerCase() === 'r' && p.audio) ouvir()
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })

  if (fim) {
    return (
      <div className="exercise">
        <h2 className="prompt">Concluído!</h2>
        <p className="feedback"><span className="ok">{s.ok} de {s.total} corretas</span></p>
      </div>
    )
  }

  const c = certas(p)
  const certo = respondida && sel.length === c.length && c.every((x) => sel.includes(x))
  const staff = respondida && p.depois ? p.depois : p.staff
  const temStaffOpcoes = !!p.opcoesStaff

  return (
    <div className="exercise">
      {niveis && !fixas && <Niveis nomes={niveis} nivel={lv.nivel} max={lv.max} onChange={trocarNivel} progresso={lv.progresso} />}
      {topo?.(nivel)}
      {fixas && <div className="muted small">Pergunta {idx + 1} de {fixas.length}</div>}
      <h2 className="prompt">{p.texto}</h2>
      {staff && (
        <div className="staff-box" style={{ maxWidth: (staff.width ?? 600) * 1.6 }}>
          <Staff height={140} y={15} {...staff} />
        </div>
      )}
      {p.audio && (
        <div className="row center">
          <button className="btn" onClick={() => ouvir()}>▶ {p.audio.rotulo ?? 'Ouvir'} <small className="muted">(R)</small></button>
          {respondida && p.audioResposta && (
            <button className="btn" onClick={() => tocarSequencia(p.audioResposta!.notas, p.audioResposta!.opcoes)}>▶ Ouvir a resposta certa</button>
          )}
        </div>
      )}
      <div className={'answers wide' + (temStaffOpcoes ? ' staff-opts' : '')}>
        {p.opcoes.map((o, i) => (
          <button
            key={o + i}
            className={'answer ' + (respondida && c.includes(i) ? 'certo' : respondida && sel.includes(i) ? 'errado' : !respondida && sel.includes(i) ? 'marcado' : '')}
            onClick={() => clicar(i)}
            aria-pressed={p.multi ? sel.includes(i) : undefined}
          >
            <small>{i + 1}</small> {o}
            {p.opcoesStaff?.[i] && <span className="opt-staff"><Staff height={110} y={5} width={220} {...p.opcoesStaff[i]} /></span>}
          </button>
        ))}
      </div>
      {p.multi && !respondida && (
        <div className="row center"><button className="btn primary" disabled={!sel.length} onClick={() => confirmar(sel)}>Verificar (Enter)</button></div>
      )}
      <div className="feedback" aria-live="polite">
        {respondida && (
          <span className={certo ? 'ok' : 'erro'}>
            {certo ? 'Correto! ' : `Resposta certa: ${c.map((i) => p.opcoes[i]).join(', ')}. `}
            <span className="explica">{p.explica}</span>
          </span>
        )}
      </div>
      {respondida && aposResposta?.(p, certo)}
      {respondida && <div className="row center"><button className="btn primary" onClick={nova}>{fixas && idx === fixas.length - 1 ? 'Ver resultado' : 'Próxima (Enter)'}</button></div>}
      <div className="statsbar"><span>Acertos: <b>{s.ok}/{s.total}</b></span><span>Sequência: <b>{s.seq}</b></span></div>
    </div>
  )
}
