// "Que nota é esta?" — todas as notas do pentagrama (e abaixo dele) desde o início,
// com repetição espaçada: notas erradas ou ainda não dominadas aparecem com mais frequência.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Staff from '../components/Staff'
import { tocar } from '../music/audio'
import { NOMES, NOTAS_QUIZ, grau, nome, posicao, toneName, vexKey, type Clef } from '../music/notes'
import { load, registrar, save } from '../store'

interface Stat { streak: number; ok: number; erro: number }
type Stats = Record<string, Stat>
interface Q { clef: Clef; d: number }

const STREAK_PARA_DOMINAR = 3
const ID: Record<string, string> = { treble: 'notas-sol', bass: 'notas-fa', mixed: 'notas-mistas' }

export default function NoteQuiz({ clef }: { clef: Clef | 'mixed' }) {
  const chave = 'srs-' + clef
  const [stats, setStats] = useState<Stats>(() => load(chave + ':stats', {}))
  const [q, setQ] = useState<Q | null>(null)
  const [resp, setResp] = useState<{ escolha: number; certo: boolean } | null>(null)
  const [sessao, setSessao] = useState({ ok: 0, total: 0, seq: 0 })
  const ultimo = useRef<string>('')

  const pool: Q[] = useMemo(() => {
    const clefs: Clef[] = clef === 'mixed' ? ['treble', 'bass'] : [clef]
    return clefs.flatMap((c) => NOTAS_QUIZ[c].map((d) => ({ clef: c, d })))
  }, [clef])
  const k = (x: Q) => `${x.clef}:${x.d}`

  const proxima = useCallback(
    (st: Stats) => {
      // peso maior para notas nunca vistas, erradas recentemente ou ainda não dominadas
      const pesos = pool.map((x) => {
        if (k(x) === ultimo.current) return 0
        const s = st[k(x)]
        if (!s) return 2.5
        return 0.4 + 3 / (1 + s.streak) + Math.min(s.erro, 5) * 0.3
      })
      const tot = pesos.reduce((a, b) => a + b, 0)
      let r = Math.random() * tot
      let i = 0
      while (r > pesos[i] && i < pesos.length - 1) r -= pesos[i++]
      ultimo.current = k(pool[i])
      setQ(pool[i])
      setResp(null)
    },
    [pool],
  )

  useEffect(() => {
    proxima(stats)
  }, [pool]) // eslint-disable-line react-hooks/exhaustive-deps

  const responder = useCallback(
    (g: number) => {
      if (!q || resp) return
      const certo = grau(q.d) === g
      tocar(toneName(q.d), '2n')
      const s0 = stats[k(q)] ?? { streak: 0, ok: 0, erro: 0 }
      const s1: Stat = certo ? { ...s0, streak: s0.streak + 1, ok: s0.ok + 1 } : { ...s0, streak: 0, erro: s0.erro + 1 }
      const novo = { ...stats, [k(q)]: s1 }
      setStats(novo)
      save(chave + ':stats', novo)
      setResp({ escolha: g, certo })
      setSessao((s) => ({ ok: s.ok + (certo ? 1 : 0), total: s.total + 1, seq: certo ? s.seq + 1 : 0 }))
      registrar(ID[clef], { acertos: certo ? 1 : 0, tentativas: 1 })
      setTimeout(() => proxima(novo), certo ? 650 : 1800)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, resp, stats, proxima],
  )

  // atalhos: 1–7 ou letras C D E F G A B
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const num = Number(e.key)
      if (num >= 1 && num <= 7) return responder(num - 1)
      const l = 'cdefgab'.indexOf(e.key.toLowerCase())
      if (l >= 0 && e.key.length === 1) responder(l)
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [responder])

  if (!q) return null
  const cor = resp ? (resp.certo ? '#16a34a' : '#dc2626') : undefined
  const dominadas = pool.filter((x) => (stats[k(x)]?.streak ?? 0) >= STREAK_PARA_DOMINAR).length

  return (
    <div className="exercise">
      <h2 className="prompt">Que nota é esta?</h2>
      <div className="staff-box big">
        <Staff clef={q.clef} measures={[[{ keys: [vexKey(q.d)], dur: 'w', color: cor }]]} width={320} height={160} y={15} />
      </div>
      <div className="feedback" aria-live="polite">
        {resp ? (
          resp.certo ? <span className="ok">Isso! {nome(q.d)} ✓</span> : <span className="erro">Era <b>{nome(q.d)}</b> — {posicao(q.clef, q.d)}</span>
        ) : <span className="muted">{q.clef === 'treble' ? 'Clave de Sol' : 'Clave de Fá'}</span>}
      </div>
      <div className="answers">
        {NOMES.map((nm, g) => (
          <button
            key={nm}
            className={'answer ' + (resp && grau(q.d) === g ? 'certo' : resp && resp.escolha === g ? 'errado' : '')}
            onClick={() => responder(g)}
          >
            {nm}
          </button>
        ))}
      </div>
      <div className="statsbar">
        <span>Acertos: <b>{sessao.ok}/{sessao.total}</b></span>
        <span>Sequência: <b>{sessao.seq}</b></span>
        <span>Dominadas: <b>{dominadas}/{pool.length}</b></span>
      </div>
      <div className="progress"><div style={{ width: `${(dominadas / pool.length) * 100}%` }} /></div>
      <p className="muted small center">
        Todas as notas do pentagrama e das linhas suplementares abaixo dele. Uma nota conta como dominada após {STREAK_PARA_DOMINAR} acertos seguidos; as que você erra voltam mais vezes. Atalhos: teclas 1–7 ou C D E F G A B.
      </p>
    </div>
  )
}
