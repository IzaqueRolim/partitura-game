// Progresso: meta diária, sequência de dias, histórico por habilidade, gráfico de prática e conquistas.
import { useState } from 'react'
import { CONQUISTAS, conquistasObtidas, definirMeta, dias, estadoNivel, hoje, metaDiaria, precisao, resumos, sequenciaDias, xpTotal } from '../store'
import { rota, type InfoAtividade } from './Revisao'

export default function Progresso({ atividades }: { atividades: InfoAtividade[] }) {
  const [meta, setMeta] = useState(metaDiaria())
  const ds = dias()
  const r = resumos()
  const hojeD = ds[hoje()] ?? { respostas: 0, acertos: 0, xp: 0 }
  const obtidas = conquistasObtidas()
  const titulo = (id: string) => atividades.find((a) => a.id === rota(id))?.titulo ?? id

  // últimos 14 dias
  const ult = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    const k = hoje(d)
    return { k, dia: d.getDate(), sem: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), ...(ds[k] ?? { respostas: 0, acertos: 0, xp: 0 }) }
  })
  const max = Math.max(meta, ...ult.map((x) => x.respostas))
  const habilidades = Object.entries(r).filter(([id, x]) => id !== 'revisao' && (x.tentativas ?? 0) > 0).sort((a, b) => (b[1].ultima ?? 0) - (a[1].ultima ?? 0))

  return (
    <div className="progresso">
      <section className="kpis">
        <div className="kpi">
          <span className="kpi-label">Meta de hoje</span>
          <span className="kpi-valor">{hojeD.respostas}<small>/{meta}</small></span>
          <div className="progress"><div style={{ width: `${Math.min(100, (hojeD.respostas / meta) * 100)}%` }} /></div>
          <label className="ctl small">
            <span>Meta diária</span>
            <select id="meta-diaria" value={meta} onChange={(e) => { const v = Number(e.target.value); setMeta(v); definirMeta(v) }}>
              {[10, 20, 30, 50, 100].map((v) => <option key={v} value={v}>{v} respostas</option>)}
            </select>
          </label>
        </div>
        <div className="kpi"><span className="kpi-label">Sequência</span><span className="kpi-valor">{sequenciaDias()}<small> dia(s)</small></span><span className="muted small">dias seguidos praticando</span></div>
        <div className="kpi"><span className="kpi-label">Experiência</span><span className="kpi-valor">{xpTotal()}<small> XP</small></span><span className="muted small">10 por acerto, 2 por tentativa</span></div>
        <div className="kpi"><span className="kpi-label">Conquistas</span><span className="kpi-valor">{Object.keys(obtidas).length}<small>/{CONQUISTAS.length}</small></span></div>
      </section>

      <section className="painel">
        <h2>Respostas por dia</h2>
        <div className="grafico" role="img" aria-label="Respostas nos últimos 14 dias">
          <div className="grafico-meta" style={{ bottom: `${(meta / max) * 100}%` }}><span>meta {meta}</span></div>
          {ult.map((x) => (
            <div key={x.k} className="barra-col" title={`${x.k}: ${x.respostas} respostas, ${x.acertos} acertos`}>
              <div className="barra" style={{ height: `${(x.respostas / max) * 100}%` }}>{x.respostas > 0 && <span className="barra-valor">{x.respostas}</span>}</div>
              <span className="barra-rot">{x.sem}<br />{x.dia}</span>
            </div>
          ))}
        </div>
        <details className="tabela-dados">
          <summary>Ver como tabela</summary>
          <table>
            <thead><tr><th>Dia</th><th>Respostas</th><th>Acertos</th><th>XP</th></tr></thead>
            <tbody>{ult.map((x) => <tr key={x.k}><td>{x.k}</td><td>{x.respostas}</td><td>{x.acertos}</td><td>{x.xp}</td></tr>)}</tbody>
          </table>
        </details>
      </section>

      <section className="painel">
        <h2>Histórico por habilidade</h2>
        {habilidades.length ? (
          <div className="tabela-wrap">
            <table className="tabela">
              <thead><tr><th>Atividade</th><th>Tentativas</th><th>Acertos</th><th>Erros</th><th>Recente</th><th>Nível</th><th>Próxima revisão</th></tr></thead>
              <tbody>
                {habilidades.map(([id, x]) => {
                  const acc = Math.round(precisao(x) * 100)
                  const nv = estadoNivel(id)
                  const prox = x.proxima ? (x.proxima <= Date.now() ? 'hoje' : new Date(x.proxima).toLocaleDateString('pt-BR')) : '—'
                  return (
                    <tr key={id}>
                      <td><a href={'#/' + rota(id)}>{titulo(id)}</a></td>
                      <td>{x.tentativas}</td>
                      <td>{x.acertos}</td>
                      <td>{(x.tentativas ?? 0) - (x.acertos ?? 0)}</td>
                      <td><span className={'pill ' + (acc >= 85 ? 'pill-ok' : acc >= 70 ? 'pill-warn' : 'pill-erro')}>{acc}%</span></td>
                      <td>{nv.max > 1 || nv.hist[1] ? `${nv.max}` : '—'}</td>
                      <td>{prox}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="muted">Faça alguns exercícios para ver seu histórico aqui.</p>}
      </section>

      <section className="painel">
        <h2>Conquistas</h2>
        <div className="conquistas">
          {CONQUISTAS.map((c) => (
            <div key={c.id} className={'conquista' + (obtidas[c.id] ? ' obtida' : '')}>
              <span className="medalha" aria-hidden>{obtidas[c.id] ? '★' : '☆'}</span>
              <div><b>{c.nome}</b><div className="muted small">{c.desc}</div>{obtidas[c.id] && <div className="small ok">{new Date(obtidas[c.id]).toLocaleDateString('pt-BR')}</div>}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
