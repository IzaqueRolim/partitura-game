// Dicionário interativo de símbolos musicais + quiz de verificação.
import { useEffect, useState } from 'react'
import Staff from '../components/Staff'
import MultipleChoice, { type Pergunta } from '../components/MultipleChoice'
import { tocarSequencia } from '../music/player'
import { CATEGORIAS, SIMBOLOS, type Simbolo } from '../music/simbolos'
import { rand, shuffle } from '../music/notes'
import { registrar } from '../store'

export default function Dicionario() {
  const [cat, setCat] = useState<string | null>(null)
  useEffect(() => {
    registrar('simbolos', { feito: true })
  }, [])
  const [busca, setBusca] = useState('')
  const lista = SIMBOLOS.filter((s) => (!cat || s.categoria === cat) && (s.nome + s.explica).toLowerCase().includes(busca.toLowerCase()))
  return (
    <div className="dicionario">
      <div className="toolbar">
        <input id="busca-simbolo" className="busca" type="search" placeholder="Buscar símbolo…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar símbolo" />
      </div>
      <div className="chips center">
        <button className={'chip-btn' + (!cat ? ' on' : '')} onClick={() => setCat(null)}>Todos</button>
        {CATEGORIAS.map((c) => <button key={c} className={'chip-btn' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div className="simbolos">
        {lista.map((s) => <Cartao key={s.id} s={s} />)}
        {!lista.length && <p className="muted center">Nenhum símbolo encontrado.</p>}
      </div>
      <div className="next-box"><a className="btn primary" href="#/quiz-simbolos" >Testar meus conhecimentos →</a></div>
    </div>
  )
}

function Cartao({ s }: { s: Simbolo }) {
  return (
    <article className="simbolo" id={'simbolo-' + s.id}>
      <header>
        <span className="tag">{s.categoria}</span>
        <h3>{s.nome}</h3>
      </header>
      <div className="staff-box"><Staff {...s.staff} /></div>
      <p>{s.explica}</p>
      <p className="muted small"><b>Uso:</b> {s.uso}</p>
      {(s.som || s.contraste) && (
        <div className="row">
          {s.som && <button className="btn small" onClick={() => tocarSequencia(s.som!, s.opcoesSom)}>▶ Ouvir</button>}
          {s.contraste && <button className="btn small" onClick={() => tocarSequencia(s.contraste!.notas, s.opcoesSom)}>▶ {s.contraste.rotulo}</button>}
        </div>
      )}
    </article>
  )
}

function gerarQuiz(nivel: number): Pergunta {
  const s = rand(SIMBOLOS)
  const tipo = nivel === 1 ? 0 : nivel === 2 ? 1 : rand([0, 1, 2])
  // no reconhecimento visual, evita distratores que também aparecem no desenho
  // (barras e fórmula de compasso estão em quase todo trecho; dinâmicas aparecem junto de crescendos)
  const visivel = (x: Simbolo) => x.categoria === 'Leitura e organização' || (s.categoria === 'Dinâmica' && x.categoria === 'Dinâmica')
  const outros = shuffle(SIMBOLOS.filter((x) => x.id !== s.id && (tipo !== 0 || !visivel(x)))).slice(0, 3)
  const ops = shuffle([s, ...outros])
  if (tipo === 0)
    return {
      texto: 'Qual símbolo aparece em destaque neste trecho?', staff: s.staff,
      opcoes: ops.map((x) => x.nome), certa: ops.indexOf(s), conceito: s.id,
      audio: s.som ? { notas: s.som, opcoes: s.opcoesSom } : undefined,
      explica: `${s.nome}: ${s.curto.toLowerCase()}.`,
    }
  if (tipo === 1)
    return {
      texto: `O que significa “${s.nome}”?`,
      opcoes: ops.map((x) => x.curto), certa: ops.indexOf(s), conceito: s.id,
      explica: s.explica,
    }
  // ouvir e reconhecer (apenas símbolos com demonstração sonora)
  const comSom = SIMBOLOS.filter((x) => x.som && x.categoria !== 'Leitura e organização')
  const alvo = rand(comSom)
  const ops2 = shuffle([alvo, ...shuffle(comSom.filter((x) => x.id !== alvo.id && x.categoria === alvo.categoria)).slice(0, 2), ...shuffle(comSom.filter((x) => x.categoria !== alvo.categoria)).slice(0, 1)])
  return {
    texto: 'Ouça. Qual indicação descreve melhor o que você escutou?',
    audio: { notas: alvo.som!, opcoes: alvo.opcoesSom, auto: true },
    opcoes: ops2.map((x) => x.nome), certa: ops2.indexOf(alvo), conceito: alvo.id,
    explica: `${alvo.nome}: ${alvo.curto.toLowerCase()}.`,
  }
}

export function QuizSimbolos() {
  return <MultipleChoice skill="quiz-simbolos" niveis={['Reconheça o símbolo', 'Significado', 'Misto com percepção']} gerar={gerarQuiz} />
}
