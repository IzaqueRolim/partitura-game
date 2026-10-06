// Botões de resposta com nome de nota (Dó…Si) e, opcionalmente, acidente (♮ ♯ ♭).
import { useEffect, useState } from 'react'
import { NOMES, type Acc } from '../music/notes'

interface Props {
  onResposta: (grau: number, acc: Acc) => void
  acidentes?: boolean
  disabled?: boolean
  marcar?: { grau: number; tipo: 'certo' | 'errado' } | null
}

export default function RespostaNota({ onResposta, acidentes, disabled, marcar }: Props) {
  const [acc, setAcc] = useState<Acc>(0)
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (disabled || e.ctrlKey || e.metaKey) return
      const num = Number(e.key)
      let g = num >= 1 && num <= 7 ? num - 1 : -1
      if (g < 0 && e.key.length === 1) g = 'cdefga'.indexOf(e.key.toLowerCase()) // "b" fica para o bemol quando há acidentes
      if (g < 0 && e.key.toLowerCase() === 'b' && !acidentes) g = 6
      if (acidentes && e.key === '#') return setAcc(1)
      if (acidentes && e.key === 'b') return setAcc(-1)
      if (acidentes && e.key === 'n') return setAcc(0)
      if (g >= 0) { onResposta(g, acc); setAcc(0) }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })
  return (
    <div className="resposta-nota">
      {acidentes && (
        <div className="seg" role="group" aria-label="Acidente">
          {([0, 1, -1] as Acc[]).map((a) => (
            <button key={a} className={acc === a ? 'on' : ''} onClick={() => setAcc(a)} disabled={disabled}>{a === 0 ? '♮ natural' : a === 1 ? '♯ sustenido' : '♭ bemol'}</button>
          ))}
        </div>
      )}
      <div className="answers">
        {NOMES.map((nm, g) => (
          <button key={nm} disabled={disabled} className={'answer ' + (marcar?.grau === g ? marcar.tipo : '')} onClick={() => { onResposta(g, acc); setAcc(0) }}>
            {nm}{acidentes && acc ? (acc === 1 ? '♯' : '♭') : ''}
          </button>
        ))}
      </div>
    </div>
  )
}
