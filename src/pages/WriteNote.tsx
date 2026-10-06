// "Escreva a nota": o aluno clica (ou toca) no pentagrama para posicionar a nota pedida.
import { useEffect, useState } from 'react'
import Staff, { type SNote } from '../components/Staff'
import { tocar } from '../music/audio'
import { BASE_LINHA, grau, lineToNote, nome, NOMES, ORDEM_DESBLOQUEIO, posicao, rand, toneName, vexKey, type Clef } from '../music/notes'
import { registrar } from '../store'

const MIN_LINE = -1 // duas linhas suplementares abaixo
const MAX_LINE = 7 // duas acima

export default function WriteNote({ clef }: { clef: Clef }) {
  const [alvo, setAlvo] = useState(() => rand([0, 1, 2, 3, 4, 5, 6]))
  const [ghost, setGhost] = useState<number | null>(null)
  const [pendente, setPendente] = useState<number | null>(null) // toque no celular: confirma depois
  const [res, setRes] = useState<{ d: number; certo: boolean } | null>(null)
  const [sessao, setSessao] = useState({ ok: 0, total: 0 })

  const validas = ORDEM_DESBLOQUEIO[clef].filter((d) => grau(d) === alvo)
  const dentro = (line: number) => line >= MIN_LINE && line <= MAX_LINE

  function responder(d: number) {
    if (res) return
    const certo = grau(d) === alvo
    tocar(toneName(d), '2n')
    setRes({ d, certo })
    setPendente(null)
    setSessao((s) => ({ ok: s.ok + (certo ? 1 : 0), total: s.total + 1 }))
    registrar(clef === 'treble' ? 'escrever-sol' : 'escrever-fa', { acertos: certo ? 1 : 0, tentativas: 1 })
  }

  function proxima() {
    let a = alvo
    while (a === alvo) a = rand([0, 1, 2, 3, 4, 5, 6])
    setAlvo(a)
    setRes(null)
    setGhost(null)
  }

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && res) proxima()
      if (e.key === 'Enter' && pendente !== null) responder(pendente)
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })

  const onPointer = (kind: 'move' | 'click' | 'leave', line: number | null, e: React.PointerEvent) => {
    if (res) return
    if (kind === 'leave') return setGhost(pendente)
    if (line === null || !dentro(line)) return
    const d = lineToNote(clef, line)
    if (kind === 'move' && e.pointerType === 'mouse') setGhost(d)
    if (kind === 'click') {
      if (e.pointerType === 'mouse') responder(d)
      else { setPendente(d); setGhost(d) } // toque: mostra e pede confirmação
    }
  }

  let notas: SNote[] = []
  if (res) {
    notas = [{ keys: [vexKey(res.d)], dur: 'w', color: res.certo ? '#16a34a' : '#dc2626', label: nome(res.d) }]
    if (!res.certo) notas.push(...validas.slice(0, 3).map((d) => ({ keys: [vexKey(d)], dur: 'w', color: '#16a34a', label: nome(d) })))
    else notas.push(...validas.filter((d) => d !== res.d).slice(0, 2).map((d) => ({ keys: [vexKey(d)], dur: 'w', color: '#94a3b8', label: nome(d) })))
  } else if (ghost !== null) {
    notas = [{ keys: [vexKey(ghost)], dur: 'w', color: pendente !== null ? '#2563eb' : '#94a3b8' }]
  }

  return (
    <div className="exercise">
      <h2 className="prompt">Escreva o <b className="accent">{NOMES[alvo]}</b> no pentagrama</h2>
      <div className="staff-box big">
        <Staff clef={clef} measures={[notas]} width={320} height={160} y={20} onPointer={onPointer} />
      </div>
      <div className="feedback" aria-live="polite">
        {res ? (
          res.certo ? <span className="ok">Certo! {nome(res.d)} fica na {posicao(clef, res.d)}. As outras posições em cinza também são {NOMES[alvo]} (outras oitavas).</span>
            : <span className="erro">Você escreveu {nome(res.d)}. O {NOMES[alvo]} fica em: {validas.slice(0, 3).map((d) => posicao(clef, d)).join(' ou ')}.</span>
        ) : pendente !== null ? <span className="muted">Posição escolhida: confirme abaixo</span>
          : <span className="muted">Clique numa linha ou espaço. Vale qualquer oitava.</span>}
      </div>
      <div className="row center">
        {pendente !== null && !res && <button className="btn primary" onClick={() => responder(pendente)}>Confirmar</button>}
        {res && <button className="btn primary" onClick={proxima}>Próxima (Enter)</button>}
      </div>
      <div className="statsbar"><span>Acertos: <b>{sessao.ok}/{sessao.total}</b></span><span>{clef === 'treble' ? 'Clave de Sol: a 2ª linha é Sol' : 'Clave de Fá: a 4ª linha é Fá'}</span></div>
      <p className="muted small center">Dica: na clave de {clef === 'treble' ? 'Sol' : 'Fá'}, a 1ª linha é {nome(BASE_LINHA[clef] + 2)}. Conte linha → espaço → linha a partir dela.</p>
    </div>
  )
}
