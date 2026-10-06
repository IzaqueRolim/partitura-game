// Percepção auditiva: o piano toca uma nota e o aluno identifica qual é.
// Começa com poucas notas, amplia para a escala inteira e depois inclui sustenidos e bemóis.
import MultipleChoice, { type Pergunta } from '../components/MultipleChoice'
import Piano from '../components/Piano'
import { tocarSequencia } from '../music/player'
import { nomesMidi, rand, toneDeMidi } from '../music/notes'

export const NIVEIS_PERCEPCAO = ['Dó, Ré e Mi', 'Dó até Sol', 'Escala de Dó (7 notas)', 'Notas naturais em 2 oitavas', 'Sustenidos e bemóis']

const NATURAIS = [0, 2, 4, 5, 7, 9, 11]
function conjunto(nivel: number): number[] {
  if (nivel === 1) return [60, 62, 64]
  if (nivel === 2) return [60, 62, 64, 65, 67]
  if (nivel === 3) return NATURAIS.map((s) => 60 + s)
  if (nivel === 4) return [...NATURAIS.map((s) => 48 + s), ...NATURAIS.map((s) => 60 + s)]
  return Array.from({ length: 12 }, (_, i) => 60 + i)
}
const rotulo = (m: number) => {
  const nm = nomesMidi(m)
  return nm.bem ? `${nm.sust} / ${nm.bem}` : nm.sust
}

let ultima = -1
function gerar(nivel: number): Pergunta {
  const notas = conjunto(nivel)
  let m = rand(notas)
  if (m === ultima && notas.length > 1) m = rand(notas.filter((x) => x !== m))
  ultima = m
  // opções: nomes distintos do conjunto (oitavas diferentes têm o mesmo nome)
  const nomes = [...new Set(notas.map(rotulo))]
  const certo = rotulo(m)
  const preta = !!nomesMidi(m).bem
  return {
    texto: 'Que nota o piano tocou?',
    audio: { notas: [{ t: 0, dur: 2, notas: [toneDeMidi(m)] }], opcoes: { bpm: 80 }, auto: true, rotulo: 'Ouvir a nota' },
    opcoes: nomes,
    certa: nomes.indexOf(certo),
    conceito: String(m),
    explica: preta
      ? `Era ${certo} (tecla preta). Compare com o Dó de referência e conte os semitons.`
      : `Era ${certo}${nivel >= 4 ? ` (${certo}${Math.floor(m / 12) - 1})` : ''}. Toque as teclas abaixo para comparar os sons.`,
  }
}

export default function Percepcao() {
  return (
    <MultipleChoice
      skill="percepcao"
      niveis={NIVEIS_PERCEPCAO}
      gerar={gerar}
      topo={(nivel) => (
        <div className="toolbar">
          <button className="btn small" onClick={() => tocarSequencia([{ t: 0, dur: 2, notas: ['C4'] }])}>▶ Dó de referência</button>
          <span className="muted small">{conjunto(nivel).length} notas possíveis neste nível</span>
        </div>
      )}
      aposResposta={(p, certo) => {
        const m = Number(p.conceito)
        return (
          <div className="apos">
            {!certo && <p className="muted small center">A tecla verde é a nota tocada. Clique nas teclas para comparar.</p>}
            <Piano from={m < 60 ? 48 : 60} to={m < 60 ? 72 : 72} marks={{ [m]: 'ok' }} labels computerKeys={false} />
          </div>
        )
      }}
    />
  )
}
