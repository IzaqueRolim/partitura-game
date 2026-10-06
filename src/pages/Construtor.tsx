// Construtor interativo de compassos: monte, complete e corrija compassos com figuras e pausas.
// A validação considera a duração de cada figura/pausa e a fórmula de compasso escolhida.
import { useState } from 'react'
import Staff from '../components/Staff'
import Niveis from '../components/Niveis'
import { SeletorCompasso } from '../components/Controles'
import { useNivel } from '../hooks/useNivel'
import { tocarCompassos } from '../music/player'
import { rand } from '../music/notes'
import {
  PALETA, beats, compasso, duracaoCompasso, fmtDuracao, gerarCompasso, nomeFigura, somaFiguras, toSNote, valorPulso,
  type Compasso, type Figura,
} from '../music/rhythm'
import { registrar } from '../store'

export const NIVEIS_CONSTRUTOR = ['Monte um compasso', 'Complete o compasso', 'Corrija o compasso']

interface Item { f: Figura; fixo: boolean }
const EPS = 1e-9

/** decompõe uma duração nas maiores figuras possíveis (para sugerir o que falta) */
function decompor(v: number): Figura[] {
  const out: Figura[] = []
  let r = v
  for (const f of PALETA.filter((x) => !x.rest)) {
    while (r + EPS >= beats(f)) { out.push(f); r -= beats(f) }
  }
  return out
}

/** em compassos compostos, verifica se alguma figura atravessa o limite de um pulso */
function atravessaPulso(fs: Figura[], c: Compasso): boolean {
  if (c.tipo !== 'composto') return false
  const p = valorPulso(c)
  let t = 0
  for (const f of fs) {
    const ini = t, fim = t + beats(f)
    const pulsoIni = Math.floor(ini / p + EPS)
    const fimPulso = (pulsoIni + 1) * p
    // atravessa se começa no meio de um pulso e termina depois dele
    if (ini % p > EPS && fim > fimPulso + EPS) return true
    t = fim
  }
  return false
}

function tarefa(nivel: number, c: Compasso): { itens: Item[]; enunciado: string } {
  const total = duracaoCompasso(c)
  if (nivel === 1) return { itens: [], enunciado: `Monte um compasso completo de ${c.id} (${fmtDuracao(total, c)}).` }
  const base = gerarCompasso(nivel === 2 ? 2 : 3, c)
  if (nivel === 2) {
    const k = Math.max(1, Math.floor(base.length / 2))
    return { itens: base.slice(0, base.length - k).map((f) => ({ f, fixo: true })), enunciado: 'Complete o compasso (as figuras em cinza já estão no lugar).' }
  }
  // nível 3: compasso errado (falta ou sobra) para corrigir
  const fs = [...base]
  if (Math.random() < 0.5 && fs.length > 1) fs.splice(Math.floor(Math.random() * fs.length), 1)
  else fs.splice(Math.floor(Math.random() * fs.length), 0, rand(PALETA.filter((x) => beats(x) <= 2)))
  if (Math.abs(somaFiguras(fs) - total) < EPS) fs.push({ dur: '8' })
  return { itens: fs.map((f) => ({ f, fixo: false })), enunciado: 'Este compasso está com a duração errada. Corrija-o removendo ou adicionando figuras.' }
}

export default function Construtor() {
  const lv = useNivel('construtor', NIVEIS_CONSTRUTOR.length, NIVEIS_CONSTRUTOR)
  const [c, setC] = useState<Compasso>(compasso('4/4'))
  const [t, setT] = useState(() => tarefa(lv.nivel, c))
  const [itens, setItens] = useState<Item[]>(t.itens)
  const [feedback, setFeedback] = useState<{ ok: boolean; texto: string } | null>(null)
  const [sobre, setSobre] = useState(false)

  const total = duracaoCompasso(c)
  const soma = somaFiguras(itens.map((i) => i.f))
  const pct = Math.min(100, (soma / total) * 100)

  function nova(nv = lv.nivel, cc = c) {
    const tt = tarefa(nv, cc)
    setT(tt)
    setItens(tt.itens)
    setFeedback(null)
  }

  function adicionar(f: Figura) {
    setItens((x) => [...x, { f, fixo: false }])
    setFeedback(null)
  }
  function remover(i: number) {
    setItens((x) => x.filter((_, j) => j !== i))
    setFeedback(null)
  }

  function verificar() {
    const fs = itens.map((i) => i.f)
    const dif = total - soma
    let ok = false
    let texto: string
    if (Math.abs(dif) < EPS) {
      ok = true
      texto = `Correto! As figuras e pausas somam ${fmtDuracao(total, c)}, exatamente o que ${c.id} pede.`
      if (atravessaPulso(fs, c)) texto += ` Dica: em ${c.id} prefira escrever figuras que não atravessem o meio de um pulso (de 3 colcheias); isso facilita a leitura.`
      if (fs.every((f) => f.rest)) texto += ' (Um compasso só de pausas é válido, mas pouco musical.)'
    } else if (dif > 0) {
      const sug = decompor(dif).map((f) => nomeFigura(f).toLowerCase()).join(' + ')
      texto = `Ainda faltam ${fmtDuracao(dif, c)}. Você tem ${fmtDuracao(soma, c)} de ${fmtDuracao(total, c)}. Por exemplo: ${sug} (ou as pausas de mesmo valor).`
    } else {
      texto = `Passou ${fmtDuracao(-dif, c)} do limite: o compasso tem ${fmtDuracao(soma, c)}, mas ${c.id} comporta ${fmtDuracao(total, c)}. Remova ou troque figuras.`
    }
    setFeedback({ ok, texto })
    registrar('construtor', { acertos: ok ? 1 : 0, tentativas: 1 })
    lv.registrarNivel(ok)
  }

  const measure = itens.map((i, j) => toSNote(i.f, 'c/5', { color: i.fixo ? '#9ca3af' : feedback ? (feedback.ok ? '#16a34a' : '#dc2626') : undefined, labelTop: String(j + 1) }))

  return (
    <div className="exercise">
      <Niveis nomes={NIVEIS_CONSTRUTOR} nivel={lv.nivel} max={lv.max} progresso={lv.progresso} onChange={(nv) => { lv.setNivel(nv); nova(nv) }} />
      <div className="toolbar"><SeletorCompasso valor={c} onChange={(cc) => { setC(cc); nova(lv.nivel, cc) }} /></div>
      <h2 className="prompt small-prompt">{t.enunciado}</h2>

      <div
        className={'staff-box drop' + (sobre ? ' sobre' : '')}
        onDragOver={(e) => { e.preventDefault(); setSobre(true) }}
        onDragLeave={() => setSobre(false)}
        onDrop={(e) => {
          e.preventDefault()
          setSobre(false)
          const i = Number(e.dataTransfer.getData('text/plain'))
          if (PALETA[i]) adicionar(PALETA[i])
        }}
      >
        <Staff clef="treble" time={c.id} measures={[measure]} width={520} height={150} y={20} />
        {!itens.length && <div className="drop-hint">Arraste figuras para cá ou clique nelas abaixo</div>}
      </div>

      <div className="medidor" aria-label={`${fmtDuracao(soma, c)} de ${fmtDuracao(total, c)}`}>
        <div className={'medidor-fill' + (soma > total + EPS ? ' over' : Math.abs(soma - total) < EPS ? ' full' : '')} style={{ width: `${pct}%` }} />
        {Array.from({ length: Math.round(total / valorPulso(c)) - 1 }, (_, i) => (
          <span key={i} className="medidor-tick" style={{ left: `${((i + 1) * valorPulso(c) / total) * 100}%` }} />
        ))}
      </div>
      <div className="muted small center">{fmtDuracao(soma, c)} de {fmtDuracao(total, c)}</div>

      {itens.length > 0 && (
        <div className="chips">
          {itens.map((it, i) => (
            <span key={i} className={'chip' + (it.fixo ? ' fixo' : '')}>
              {i + 1}. {nomeFigura(it.f)}
              {!it.fixo && <button aria-label={`Remover ${nomeFigura(it.f)}`} onClick={() => remover(i)}>×</button>}
            </span>
          ))}
        </div>
      )}

      <div className="paleta" aria-label="Figuras e pausas">
        {PALETA.map((f, i) => (
          <button key={i} className="paleta-item" draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', String(i))} onClick={() => adicionar(f)} title={`${nomeFigura(f)} — ${fmtDuracao(beats(f), c)}`}>
            <Staff clef={null} measures={[[toSNote(f, 'c/5')]]} width={70} height={90} y={0} />
            <span>{nomeFigura(f).replace('Pausa de ', 'P. ')}</span>
            <small>{fmtDuracao(beats(f), c)}</small>
          </button>
        ))}
      </div>

      <div className="row center">
        <button className="btn" onClick={() => setItens((x) => { const k = [...x]; for (let i = k.length - 1; i >= 0; i--) if (!k[i].fixo) { k.splice(i, 1); break } return k })}>Desfazer</button>
        <button className="btn" onClick={() => setItens((x) => x.filter((i) => i.fixo))}>Limpar</button>
        <button className="btn" disabled={!itens.length} onClick={() => tocarCompassos([measure], { compasso: c, metronomo: true, bpm: c.tipo === 'composto' ? 50 : 72, compassos: 1 })}>▶ Ouvir</button>
        <button className="btn primary" disabled={!itens.length} onClick={verificar}>Verificar</button>
      </div>
      <div className="feedback" aria-live="polite">{feedback && <span className={feedback.ok ? 'ok' : 'erro'}>{feedback.texto}</span>}</div>
      {feedback?.ok && <div className="row center"><button className="btn primary" onClick={() => nova()}>Novo compasso</button></div>}
    </div>
  )
}
