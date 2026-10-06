// Controles reutilizáveis: escolha de fórmula de compasso (simples/compostos),
// quantidade de compassos e andamento.
import { COMPASSOS, type Compasso } from '../music/rhythm'

export function SeletorCompasso({ valor, onChange, disabled, permitidos }: { valor: Compasso; onChange: (c: Compasso) => void; disabled?: boolean; permitidos?: string[] }) {
  const lista = COMPASSOS.filter((c) => !permitidos || permitidos.includes(c.id))
  const grupo = (tipo: Compasso['tipo']) => lista.filter((c) => c.tipo === tipo)
  return (
    <label className="ctl">
      <span>Compasso</span>
      <select value={valor.id} disabled={disabled} onChange={(e) => onChange(COMPASSOS.find((c) => c.id === e.target.value)!)} title={valor.descricao}>
        {grupo('simples').length > 0 && (
          <optgroup label="Simples (pulso de semínima)">
            {grupo('simples').map((c) => <option key={c.id} value={c.id}>{c.id} — {c.nome}</option>)}
          </optgroup>
        )}
        {grupo('composto').length > 0 && (
          <optgroup label="Compostos (pulso de semínima pontuada)">
            {grupo('composto').map((c) => <option key={c.id} value={c.id}>{c.id} — {c.nome}</option>)}
          </optgroup>
        )}
      </select>
    </label>
  )
}

export function SeletorQuantidade({ valor, onChange, min = 2, max = 10, disabled, rotulo = 'Compassos' }: { valor: number; onChange: (n: number) => void; min?: number; max?: number; disabled?: boolean; rotulo?: string }) {
  return (
    <label className="ctl">
      <span>{rotulo}</span>
      <select value={valor} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))}>
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
  )
}

export function SeletorAndamento({ valor, onChange, disabled, composto }: { valor: number; onChange: (n: number) => void; disabled?: boolean; composto?: boolean }) {
  return (
    <label className="ctl bpm">
      <span>{composto ? '♩. ' : '♩ '}= {valor}</span>
      <input type="range" min={40} max={140} step={5} value={valor} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} aria-label="Andamento" />
    </label>
  )
}
