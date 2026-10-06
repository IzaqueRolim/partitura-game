// Revisão: cartões das perguntas erradas (Leitner) + habilidades com revisão espaçada vencida.
import { useState } from 'react'
import MultipleChoice, { type Pergunta } from '../components/MultipleChoice'
import { cartoesPendentes, cartoes, habilidadesParaRevisar, revisarCartao, type Cartao } from '../store'

export interface InfoAtividade { id: string; titulo: string }

export default function Revisao({ atividades }: { atividades: InfoAtividade[] }) {
  const [sessao, setSessao] = useState<Cartao[] | null>(null)
  const [fim, setFim] = useState<{ ok: number; total: number } | null>(null)
  const pend = cartoesPendentes()
  const habs = habilidadesParaRevisar()
  const titulo = (id: string) => atividades.find((a) => a.id === rota(id))?.titulo ?? id
  const total = cartoes().length

  if (sessao) {
    const perguntas = sessao.map((c) => c.pergunta as Pergunta)
    return (
      <div className="exercise">
        <p className="muted center">Revisando perguntas que você errou. Acertou: o cartão volta daqui a alguns dias. Errou: ele volta ainda hoje.</p>
        <MultipleChoice
          skill="revisao"
          fixas={perguntas}
          semRegistro
          onResposta={(certo, p) => {
            const c = sessao[perguntas.indexOf(p)]
            if (c) revisarCartao(c.id, certo)
          }}
          onFim={(ok, t) => setFim({ ok, total: t })}
        />
        <div className="row center">
          <button className="btn" onClick={() => { setSessao(null); setFim(null) }}>{fim ? 'Voltar à revisão' : 'Encerrar revisão'}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="revisao">
      <section className="painel">
        <h2>Erros para revisar</h2>
        {pend.length ? (
          <>
            <p>{pend.length} pergunta(s) que você errou estão prontas para revisão{total > pend.length ? ` (${total - pend.length} agendadas para depois)` : ''}.</p>
            <ul className="lista">
              {[...new Set(pend.map((c) => c.skill))].map((s) => <li key={s}>{titulo(s)}: {pend.filter((c) => c.skill === s).length}</li>)}
            </ul>
            <button className="btn primary" onClick={() => setSessao(pend.slice(0, 15))}>Revisar {Math.min(15, pend.length)} pergunta(s)</button>
          </>
        ) : (
          <p className="muted">Nenhum erro pendente{total ? ` agora. ${total} cartão(ões) agendado(s) para os próximos dias.` : '. Quando você errar uma pergunta, ela aparece aqui para revisar.'}</p>
        )}
      </section>

      <section className="painel">
        <h2>Conteúdos para reforçar</h2>
        {habs.length ? (
          <ul className="lista-rev">
            {habs.map((h) => (
              <li key={h.id}>
                <a href={'#/' + rota(h.id)}>{titulo(h.id)}</a>
                <span className={'pill ' + (h.motivo === 'reforco' ? 'pill-erro' : 'pill-warn')}>{h.motivo === 'reforco' ? 'precisa de reforço' : 'revisão de hoje'}</span>
                <span className="muted small">{Math.round(h.acc * 100)}% nas últimas respostas</span>
              </li>
            ))}
          </ul>
        ) : <p className="muted">Tudo em dia. As revisões aparecem aqui conforme o intervalo de cada conteúdo (1, 2, 4, 8… dias quando você acerta bem).</p>}
      </section>
    </div>
  )
}

/** algumas habilidades são registradas com um id diferente da rota */
export function rota(skill: string): string {
  return ({ 'maestro-pulso': 'maestro' } as Record<string, string>)[skill] ?? skill
}
