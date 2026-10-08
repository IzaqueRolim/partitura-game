import { useEffect, useState } from 'react'
import Escritor from './pages/Escritor'
import { initAudio } from './music/audio'
import { pararSom } from './music/player'
import { cartoesPendentes, dias, habilidadesParaRevisar, hoje, metaDiaria, precisao, resumos, sequenciaDias, type Resumo } from './store'
import NoteQuiz from './pages/NoteQuiz'
import WriteNote from './pages/WriteNote'
import {
  LicaoPentagrama, LicaoFiguras, LicaoPausas, LicaoCompassos, LicaoTeclado, LicaoRitmo, LicaoAcidentes, LicaoIntervalos,
} from './pages/Lessons'
import TheoryQuiz from './pages/TheoryQuiz'
import PianoReading from './pages/PianoReading'
import Performance from './pages/Performance'
import Percepcao from './pages/Percepcao'
import Armaduras from './pages/Armaduras'
import Construtor from './pages/Construtor'
import Intervalos from './pages/Intervalos'
import LeituraMelodias from './pages/LeituraMelodias'
import Dicionario, { QuizSimbolos } from './pages/Dicionario'
import Maestro from './pages/Maestro'
import { LicaoEscalasMaior, LicaoEscalasMenor, LicaoEscalasBlues, LicaoEscalasJazz, IdentificarEscala, ConstruirEscalaPiano } from './pages/Escalas'
import Desafio from './pages/Desafio'
import Revisao from './pages/Revisao'
import Progresso from './pages/Progresso'
import { estadoPiano, type EstadoPiano } from './music/audio'

type Tipo = 'Lição' | 'Exercício' | 'Quiz' | 'Desafio' | 'Minigame' | 'Referência' | 'Ferramenta'
interface Item {
  id: string
  titulo: string
  tipo: Tipo
  requer?: string[]
  render: () => React.ReactNode
}
interface Unidade { titulo: string; desc: string; itens: Item[] }

export const TRILHA: Unidade[] = [
  {
    titulo: '1. Leitura de notas',
    desc: 'Pentagrama, clave de Sol e clave de Fá',
    itens: [
      { id: 'licao-pentagrama', titulo: 'O pentagrama e as claves', tipo: 'Lição', render: () => <LicaoPentagrama /> },
      { id: 'notas-sol', titulo: 'Que nota é esta? — Clave de Sol', tipo: 'Exercício', requer: ['licao-pentagrama'], render: () => <NoteQuiz clef="treble" /> },
      { id: 'notas-fa', titulo: 'Que nota é esta? — Clave de Fá', tipo: 'Exercício', requer: ['licao-pentagrama'], render: () => <NoteQuiz clef="bass" /> },
      { id: 'escrever-sol', titulo: 'Escreva a nota — Clave de Sol', tipo: 'Exercício', requer: ['notas-sol'], render: () => <WriteNote clef="treble" /> },
      { id: 'escrever-fa', titulo: 'Escreva a nota — Clave de Fá', tipo: 'Exercício', requer: ['notas-fa'], render: () => <WriteNote clef="bass" /> },
      { id: 'notas-mistas', titulo: 'Que nota é esta? — Sol e Fá misturadas', tipo: 'Desafio', requer: ['notas-sol', 'notas-fa'], render: () => <NoteQuiz clef="mixed" /> },
    ],
  },
  {
    titulo: '2. Figuras e pausas',
    desc: 'Quanto tempo dura cada som e cada silêncio',
    itens: [
      { id: 'licao-figuras', titulo: 'Figuras musicais', tipo: 'Lição', render: () => <LicaoFiguras /> },
      { id: 'quiz-figuras', titulo: 'Pratique as figuras', tipo: 'Quiz', requer: ['licao-figuras'], render: () => <TheoryQuiz tipo="figuras" /> },
      { id: 'licao-pausas', titulo: 'Pausas musicais', tipo: 'Lição', requer: ['licao-figuras'], render: () => <LicaoPausas /> },
      { id: 'quiz-pausas', titulo: 'Pratique as pausas', tipo: 'Quiz', requer: ['licao-pausas'], render: () => <TheoryQuiz tipo="pausas" /> },
    ],
  },
  {
    titulo: '3. Compasso e ritmo',
    desc: 'Fórmulas simples e compostas, pulsação e leitura rítmica',
    itens: [
      { id: 'licao-compassos', titulo: 'Compassos simples e compostos', tipo: 'Lição', requer: ['quiz-figuras'], render: () => <LicaoCompassos /> },
      { id: 'quiz-compassos', titulo: 'Pratique os compassos', tipo: 'Quiz', requer: ['licao-compassos'], render: () => <TheoryQuiz tipo="compassos" /> },
      { id: 'construtor', titulo: 'Construtor de compassos', tipo: 'Exercício', requer: ['licao-compassos', 'quiz-pausas'], render: () => <Construtor /> },
      { id: 'licao-ritmo', titulo: 'Como ler e contar ritmos', tipo: 'Lição', requer: ['licao-compassos'], render: () => <LicaoRitmo /> },
      { id: 'ritmo', titulo: 'Toque o ritmo', tipo: 'Exercício', requer: ['licao-ritmo'], render: () => <Performance modo="ritmo" /> },
      { id: 'maestro', titulo: 'Maestro do compasso', tipo: 'Minigame', requer: ['quiz-compassos'], render: () => <Maestro /> },
    ],
  },
  {
    titulo: '4. Acidentes e armaduras',
    desc: 'Sustenidos, bemóis, bequadros e tonalidades',
    itens: [
      { id: 'licao-acidentes', titulo: 'Acidentes e armaduras de clave', tipo: 'Lição', requer: ['notas-sol'], render: () => <LicaoAcidentes /> },
      { id: 'armaduras', titulo: 'Laboratório de armaduras', tipo: 'Exercício', requer: ['licao-acidentes'], render: () => <Armaduras /> },
    ],
  },
  {
    titulo: '5. Piano e percepção',
    desc: 'Do pentagrama para o teclado, e do som para o nome',
    itens: [
      { id: 'licao-teclado', titulo: 'Conhecendo o teclado', tipo: 'Lição', requer: ['licao-pentagrama'], render: () => <LicaoTeclado /> },
      { id: 'piano-sol', titulo: 'Partitura para teclado — Clave de Sol', tipo: 'Minigame', requer: ['licao-teclado', 'notas-sol'], render: () => <PianoReading clef="treble" /> },
      { id: 'piano-fa', titulo: 'Partitura para teclado — Clave de Fá', tipo: 'Minigame', requer: ['licao-teclado', 'notas-fa'], render: () => <PianoReading clef="bass" /> },
      { id: 'percepcao', titulo: 'Que nota o piano tocou?', tipo: 'Exercício', requer: ['licao-teclado'], render: () => <Percepcao /> },
      { id: 'licao-intervalos', titulo: 'Saltos e intervalos', tipo: 'Lição', requer: ['notas-sol'], render: () => <LicaoIntervalos /> },
      { id: 'intervalos', titulo: 'Treino de intervalos', tipo: 'Exercício', requer: ['licao-intervalos'], render: () => <Intervalos /> },
    ],
  },
  {
    titulo: '6. Lendo partituras',
    desc: 'Juntando tudo: melodias, símbolos e partituras completas',
    itens: [
      { id: 'melodias', titulo: 'Leitura de melodias', tipo: 'Exercício', requer: ['notas-sol', 'quiz-pausas'], render: () => <LeituraMelodias /> },
      { id: 'melodia', titulo: 'Melodia com ritmo no piano', tipo: 'Desafio', requer: ['ritmo', 'piano-sol'], render: () => <Performance modo="melodia" /> },
      { id: 'simbolos', titulo: 'Dicionário de símbolos', tipo: 'Referência', render: () => <Dicionario /> },
      { id: 'quiz-simbolos', titulo: 'Quiz de símbolos', tipo: 'Quiz', requer: ['simbolos'], render: () => <QuizSimbolos /> },
      { id: 'escritor', titulo: 'Escritor de partituras: escreva e ouça', tipo: 'Ferramenta', requer: ['quiz-figuras', 'notas-sol'], render: () => <Escritor /> },
      { id: 'desafio-partitura', titulo: 'Desafio: leia a partitura completa', tipo: 'Desafio', requer: ['melodias', 'armaduras', 'quiz-compassos'], render: () => <Desafio /> },
    ],
  },
  {
    titulo: '7. Escalas',
    desc: 'Maior, menores, pentatônicas, blues e escalas do jazz',
    itens: [
      { id: 'licao-escalas-maior', titulo: 'Escala maior: tons, semitons e construção', tipo: 'Lição', requer: ['licao-acidentes', 'licao-teclado'], render: () => <LicaoEscalasMaior /> },
      { id: 'licao-escalas-menor', titulo: 'Escalas menores: natural, harmônica e melódica', tipo: 'Lição', requer: ['licao-escalas-maior'], render: () => <LicaoEscalasMenor /> },
      { id: 'licao-escalas-blues', titulo: 'Pentatônicas e blues', tipo: 'Lição', requer: ['licao-escalas-menor'], render: () => <LicaoEscalasBlues /> },
      { id: 'licao-escalas-jazz', titulo: 'Escalas do jazz: modos, bebop e tons inteiros', tipo: 'Lição', requer: ['licao-escalas-maior'], render: () => <LicaoEscalasJazz /> },
      { id: 'escalas-identificar', titulo: 'Que escala é esta?', tipo: 'Quiz', requer: ['licao-escalas-maior', 'licao-escalas-menor'], render: () => <IdentificarEscala /> },
      { id: 'escalas-piano', titulo: 'Construa a escala no piano', tipo: 'Minigame', requer: ['licao-escalas-maior'], render: () => <ConstruirEscalaPiano /> },
    ],
  },
]

const ITENS = TRILHA.flatMap((u) => u.itens)
const ATIVIDADES = ITENS.map((i) => ({ id: i.id, titulo: i.titulo }))

/** critério de conclusão: lição lida, ou ≥10 respostas com ≥70% nas últimas 20, ou melhor resultado ≥70% */
export function concluido(r?: Resumo): boolean {
  if (!r) return false
  return !!r.feito || ((r.tentativas ?? 0) >= 10 && precisao(r, 20) >= 0.7) || (r.melhor ?? 0) >= 70
}

function useHash() {
  const [h, setH] = useState(() => location.hash.replace(/^#\/?/, ''))
  useEffect(() => {
    const f = () => setH(location.hash.replace(/^#\/?/, ''))
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return h
}

export default function App() {
  const rota = useHash()
  const item = ITENS.find((i) => i.id === rota)

  // o áudio do navegador só pode começar após um gesto do usuário
  useEffect(() => {
    const f = () => initAudio()
    window.addEventListener('pointerdown', f, { once: true })
    window.addEventListener('keydown', f, { once: true })
    return () => {
      window.removeEventListener('pointerdown', f)
      window.removeEventListener('keydown', f)
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    pararSom() // ao trocar de página, nenhum som continua tocando
  }, [rota])

  let conteudo: React.ReactNode
  if (rota === 'revisao') conteudo = <Pagina titulo="Revisão" tipo="Repetição espaçada"><Revisao atividades={ATIVIDADES} /></Pagina>
  else if (rota === 'progresso') conteudo = <Pagina titulo="Seu progresso" tipo="Histórico e conquistas"><Progresso atividades={ATIVIDADES} /></Pagina>
  else if (item) conteudo = <PaginaItem item={item} />
  else conteudo = <Home />

  return (
    <>
      <Nav rota={rota} />
      {conteudo}
      <Avisos />
    </>
  )
}

// ícones simples (traço) para a barra inferior do celular
const ICONES: Record<string, React.ReactNode> = {
  trilha: <path d="M4 19V5m0 0 6 3 6-3 4 2v12l-4-2-6 3-6-3" />,
  revisao: <><path d="M4 12a8 8 0 1 0 2.3-5.6" /><path d="M4 4v4h4" /></>,
  progresso: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />,
  simbolos: <><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></>,
  escrever: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>,
}
const Icone = ({ nome }: { nome: string }) => (
  <svg className="nav-icone" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONES[nome]}</svg>
)

function Nav({ rota }: { rota: string }) {
  const pend = cartoesPendentes().length + habilidadesParaRevisar().length
  const itens = [
    { href: '#/', on: !rota, icone: 'trilha', curto: 'Trilha', longo: 'Trilha' },
    { href: '#/revisao', on: rota === 'revisao', icone: 'revisao', curto: 'Revisão', longo: 'Revisão', badge: pend },
    { href: '#/progresso', on: rota === 'progresso', icone: 'progresso', curto: 'Progresso', longo: 'Progresso' },
    { href: '#/simbolos', on: rota === 'simbolos', icone: 'simbolos', curto: 'Símbolos', longo: 'Símbolos' },
    { href: '#/escritor', on: rota === 'escritor', icone: 'escrever', curto: 'Escrever', longo: 'Escrever partitura' },
  ]
  return (
    <>
      <nav className="nav" aria-label="Navegação principal">
        {itens.map((x) => (
          <a key={x.href} href={x.href} className={x.on ? 'on' : ''} aria-current={x.on ? 'page' : undefined}>
            <span className="nav-icone-wrap"><Icone nome={x.icone} />{!!x.badge && <span className="badge">{x.badge}</span>}</span>
            <span className="lbl-curto">{x.curto}</span><span className="lbl-longo">{x.longo}</span>
          </a>
        ))}
      </nav>
      <StatusPiano />
    </>
  )
}

function Pagina({ titulo, tipo, children }: { titulo: string; tipo: string; children: React.ReactNode }) {
  return (
    <div className="page">
      <header className="topbar"><a href="#/" className="back">← Trilha</a><span className="crumb">{tipo}</span><span /></header>
      <h1 className="title">{titulo}</h1>
      <main>{children}</main>
    </div>
  )
}

function PaginaItem({ item }: { item: Item }) {
  const r = resumos()
  const idx = ITENS.indexOf(item)
  const prox = ITENS[idx + 1]
  const faltando = (item.requer ?? []).filter((x) => !concluido(r[x]))
  return (
    <div className="page">
      <header className="topbar">
        <a href="#/" className="back">← Trilha</a>
        <span className="crumb">{item.tipo}</span>
        {prox ? <a href={'#/' + prox.id} className="next">Próximo →</a> : <span />}
      </header>
      <h1 className="title">{item.titulo}</h1>
      {faltando.length > 0 && (
        <p className="aviso-req">
          Recomendado antes: {faltando.map((x, i) => <span key={x}>{i > 0 && ', '}<a href={'#/' + x}>{ITENS.find((y) => y.id === x)?.titulo}</a></span>)}. Você pode praticar mesmo assim.
        </p>
      )}
      <main key={item.id}>{item.render()}</main>
    </div>
  )
}

function Home() {
  const r = resumos()
  const meta = metaDiaria()
  const feitasHoje = dias()[hoje()]?.respostas ?? 0
  const seq = sequenciaDias()
  const pend = cartoesPendentes().length
  const habs = habilidadesParaRevisar()
  const continuar = ITENS.find((i) => !concluido(r[i.id]) && (i.requer ?? []).every((x) => concluido(r[x])))

  return (
    <div className="page home">
      <header className="hero">
        <div className="logo" aria-hidden>𝄞</div>
        <h1>Partitura</h1>
        <p>Aprenda a ler partitura e tocar piano, passo a passo, com exercícios de repetição.</p>
      </header>

      <section className="resumo-dia">
        <div className="meta-dia">
          <span className="kpi-label">Meta de hoje</span>
          <b>{Math.min(feitasHoje, meta)}/{meta}</b>
          <div className="progress"><div style={{ width: `${Math.min(100, (feitasHoje / meta) * 100)}%` }} /></div>
        </div>
        <div><span className="kpi-label">Sequência</span><b>{seq} dia{seq === 1 ? '' : 's'}</b></div>
        <a className="rev-link" href="#/revisao"><span className="kpi-label">Revisões</span><b>{pend + habs.length}</b></a>
        {continuar && <a className="btn primary" href={'#/' + continuar.id}>Continuar: {continuar.titulo} →</a>}
      </section>

      {TRILHA.map((u) => {
        const feitos = u.itens.filter((i) => concluido(r[i.id])).length
        return (
          <section key={u.titulo} className="unit">
            <div className="unit-head">
              <h2>{u.titulo}</h2>
              <span className="muted small">{feitos}/{u.itens.length} concluídos</span>
            </div>
            <p className="muted">{u.desc}</p>
            <div className="cards">
              {u.itens.map((i) => {
                const s = r[i.id]
                const ok = concluido(s)
                const bloqueado = (i.requer ?? []).some((x) => !concluido(r[x]))
                const status = s?.melhor ? `${s.melhor}%` : s?.tentativas ? `${Math.round(precisao(s) * 100)}%` : ''
                return (
                  <a key={i.id} href={'#/' + i.id} className={`card tipo-${i.tipo}${bloqueado ? ' bloqueado' : ''}${ok ? ' concluido' : ''}`}>
                    <span className="tag">{i.tipo}</span>
                    <span className="card-title">{i.titulo}</span>
                    {ok ? <span className="status">✓ {status}</span> : status && <span className="status parcial">{status}</span>}
                    {bloqueado && <span className="req muted small">Requer: {(i.requer ?? []).filter((x) => !concluido(r[x])).map((x) => ITENS.find((y) => y.id === x)?.titulo).join(', ')}</span>}
                  </a>
                )
              })}
            </div>
          </section>
        )
      })}
      <footer className="muted foot">Dica: conecte um teclado MIDI (Chrome/Edge/Android) ou use as teclas A S D F G H J K do computador.</footer>
    </div>
  )
}

function Avisos() {
  const [lista, setLista] = useState<{ id: number; titulo: string; texto: string }[]>([])
  useEffect(() => {
    const f = (e: Event) => {
      const d = (e as CustomEvent).detail as { titulo: string; texto: string }
      const id = Math.random()
      setLista((l) => [...l, { id, ...d }])
      setTimeout(() => setLista((l) => l.filter((x) => x.id !== id)), 4500)
    }
    window.addEventListener('partitura:aviso', f)
    return () => window.removeEventListener('partitura:aviso', f)
  }, [])
  return (
    <div className="avisos" aria-live="polite">
      {lista.map((a) => <div key={a.id} className="aviso"><b>{a.titulo}</b>{a.texto && <span>{a.texto}</span>}</div>)}
    </div>
  )
}

/** indica quando o piano gravado ainda está carregando (ou se caiu para o sintetizador) */
function StatusPiano() {
  const [e, setE] = useState<EstadoPiano>(estadoPiano())
  const [iniciado, setIniciado] = useState(false)
  useEffect(() => {
    const f = (ev: Event) => setE((ev as CustomEvent).detail)
    const g = () => setIniciado(true)
    window.addEventListener('partitura:piano', f)
    window.addEventListener('pointerdown', g, { once: true })
    return () => { window.removeEventListener('partitura:piano', f); window.removeEventListener('pointerdown', g) }
  }, [])
  if (!iniciado || e === 'pronto') return null
  return <span className="status-piano muted small">{e === 'carregando' ? 'Carregando piano…' : 'Piano gravado indisponível: usando sintetizador'}</span>
}
