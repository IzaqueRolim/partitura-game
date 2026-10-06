// Barra de níveis: mostra os níveis desbloqueados e o progresso para o próximo.
import { ACERTOS_PARA_SUBIR, JANELA } from '../hooks/useNivel'

interface Props {
  nomes: string[]
  nivel: number
  max: number
  onChange: (n: number) => void
  progresso?: number
  disabled?: boolean
}

export default function Niveis({ nomes, nivel, max, onChange, progresso = 0, disabled }: Props) {
  return (
    <div className="niveis">
      <div className="seg wrap" role="tablist" aria-label="Níveis">
        {nomes.map((nm, i) => {
          const n = i + 1
          const bloqueado = n > max
          return (
            <button
              key={n}
              role="tab"
              aria-selected={nivel === n}
              disabled={bloqueado || disabled}
              className={nivel === n ? 'on' : ''}
              title={bloqueado ? `Bloqueado: acerte ${ACERTOS_PARA_SUBIR} de ${JANELA} no nível ${max}` : nm}
              onClick={() => onChange(n)}
            >
              {bloqueado && <Cadeado />}Nível {n}
            </button>
          )
        })}
      </div>
      <div className="muted small center">
        <b>{nomes[nivel - 1]}</b>
        {nivel === max && max < nomes.length && <> · próximo nível: {Math.min(progresso, ACERTOS_PARA_SUBIR)}/{ACERTOS_PARA_SUBIR} acertos nas últimas {JANELA}</>}
      </div>
    </div>
  )
}

function Cadeado() {
  return (
    <svg className="lock" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path d="M4 7V5a4 4 0 1 1 8 0v2h1v8H3V7h1Zm2 0h4V5a2 2 0 1 0-4 0v2Z" fill="currentColor" />
    </svg>
  )
}
