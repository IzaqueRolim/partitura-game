// Níveis progressivos por habilidade: o próximo nível é desbloqueado com 8 acertos nas últimas 10
// respostas do nível mais alto. O aluno pode voltar a qualquer nível já desbloqueado.
import { useCallback, useState } from 'react'
import { avisar, estadoNivel, save, type EstadoNivel } from '../store'

export const ACERTOS_PARA_SUBIR = 8
export const JANELA = 10

export function useNivel(skill: string, total: number, nomes?: string[]) {
  const [st, setSt] = useState<EstadoNivel>(() => estadoNivel(skill))

  const setNivel = useCallback((n: number) => {
    setSt((s) => {
      const novo = { ...s, atual: Math.max(1, Math.min(n, s.max)) }
      save('nivel:' + skill, novo)
      return novo
    })
  }, [skill])

  /** registra uma resposta no nível atual; devolve true se desbloqueou o próximo */
  const registrarNivel = useCallback((certo: boolean): boolean => {
    const s = estadoNivel(skill)
    const h = [...(s.hist[s.atual] ?? []), certo ? 1 : 0].slice(-JANELA)
    const novo: EstadoNivel = { ...s, hist: { ...s.hist, [s.atual]: h } }
    let subiu = false
    if (s.atual === s.max && s.max < total && h.length >= JANELA && h.reduce((a, b) => a + b, 0) >= ACERTOS_PARA_SUBIR) {
      novo.max = s.max + 1
      novo.atual = novo.max
      subiu = true
      avisar(`Nível ${novo.max} desbloqueado!`, nomes?.[novo.max - 1] ?? '')
    }
    save('nivel:' + skill, novo)
    setSt(novo)
    return subiu
  }, [skill, total, nomes])

  const progresso = (st.hist[st.atual] ?? []).reduce((a, b) => a + b, 0)
  return { nivel: st.atual, max: st.max, setNivel, registrarNivel, progresso, janela: (st.hist[st.atual] ?? []).length }
}
