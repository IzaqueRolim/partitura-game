// Desafio integrado: uma partitura completa e perguntas que combinam tudo o que foi estudado
// (fórmula de compasso, pulsação, armadura, notas, dinâmica, intervalos, pausas).
import { useState } from 'react'
import MultipleChoice, { type Pergunta } from '../components/MultipleChoice'
import type { StaffProps } from '../components/Staff'
import { ARMADURAS, armadura, intervalo, midiP, n, nomeP, rand, shuffle, NOME_NUMERO } from '../music/notes'
import { gerarMelodia, melodiaParaSom, melodiaParaStaff, type Melodia } from '../music/melody'
import { tocarSequencia } from '../music/player'
import { COMPASSOS, compasso, pulsos } from '../music/rhythm'
import { registrar } from '../store'

const DINAMICAS = [{ s: 'p', nome: 'piano (suave)', vel: 0.4 }, { s: 'mf', nome: 'mezzo forte (meio forte)', vel: 0.68 }, { s: 'f', nome: 'forte', vel: 0.9 }]

function opcoes(certa: string, todas: string[], qtd = 4): [string[], number] {
  const outras = shuffle([...new Set(todas.filter((x) => x !== certa))]).slice(0, qtd - 1)
  const ops = shuffle([certa, ...outras])
  return [ops, ops.indexOf(certa)]
}

export function gerarDesafio(): { mel: Melodia; staff: StaffProps; perguntas: Pergunta[]; dinamica: (typeof DINAMICAS)[number] } {
  const c = compasso(rand(['2/4', '3/4', '4/4', '6/8']))
  const arm = armadura(rand(['C', 'G', 'F', 'D', 'Bb']))
  let mel = gerarMelodia({ compasso: c, nCompassos: 4, nivelRitmo: 2, faixa: [n('c/4'), n('e/5')], armadura: arm })
  for (let t = 0; t < 10 && mel.eventos.filter((e) => e.pitch).length < 4; t++) mel = gerarMelodia({ compasso: c, nCompassos: 4, nivelRitmo: 2, faixa: [n('c/4'), n('e/5')], armadura: arm })
  const din = rand(DINAMICAS)
  const sons = mel.eventos.filter((e) => e.pitch)
  const primeiro = mel.eventos.findIndex((e) => e.pitch)
  const measures = melodiaParaStaff(mel)
  // dinâmica na primeira nota
  let k = 0
  measures.forEach((m) => m.forEach((s) => { if (k++ === primeiro) s.dyn = din.s }))
  const staff: StaffProps = { clef: 'treble', time: c.id, keySig: arm.vex, measures, width: 680, minMeasureWidth: 200, height: 140, y: 15, tempo: { nome: 'Moderato' } }

  const p1 = sons[0].pitch!, p2 = sons[1].pitch!
  const iv = intervalo(p1, p2)
  const pausas = mel.eventos.filter((e) => e.figura.rest).length
  const maisAguda = sons.reduce((a, b) => (midiP(b.pitch!) > midiP(a.pitch!) ? b : a)).pitch!
  const destacar = (idxs: number[]): StaffProps => {
    let j = 0
    return { ...staff, measures: staff.measures.map((m) => m.map((s) => ({ ...s, color: idxs.includes(j++) ? '#2563eb' : undefined }))) }
  }
  const idxSom = mel.eventos.map((e, i) => (e.pitch ? i : -1)).filter((i) => i >= 0)

  const perguntas: Pergunta[] = []
  {
    const [ops, i] = opcoes(c.id, COMPASSOS.map((x) => x.id))
    perguntas.push({ texto: 'Qual é a fórmula de compasso?', staff, opcoes: ops, certa: i, conceito: 'formula', explica: `${c.id}: ${c.nome.toLowerCase()}.` })
  }
  {
    const certa = String(pulsos(c))
    const [ops, i] = opcoes(certa, ['2', '3', '4', '6'])
    perguntas.push({ texto: 'Quantos pulsos (tempos) você sente em cada compasso?', staff, opcoes: ops, certa: i, conceito: 'pulsos', explica: c.tipo === 'composto' ? `Em ${c.id} o pulso é a semínima pontuada: ${c.num} colcheias ÷ 3 = ${certa} pulsos.` : `Em ${c.id} o número de cima indica ${certa} tempos de semínima.` })
  }
  {
    const [ops, i] = opcoes(arm.maior, ARMADURAS.filter((a) => a.qtd <= 3).map((a) => a.maior))
    perguntas.push({ texto: 'Pela armadura, qual é a tonalidade maior?', staff, opcoes: ops, certa: i, conceito: 'tonalidade', explica: arm.qtd ? `${arm.qtd} ${arm.tipo === 1 ? 'sustenido(s)' : 'bemol(óis)'} → ${arm.maior}.` : 'Sem acidentes na armadura → Dó maior (ou Lá menor).' })
  }
  {
    const certa = nomeP(p1)
    const base = certa.replace(/[♯♭]/, '')
    const [ops, i] = opcoes(certa, [base, base + '♯', base + '♭', nomeP({ d: p1.d + 1, acc: 0 }), nomeP({ d: p1.d - 1, acc: 0 })])
    perguntas.push({ texto: 'Qual é a primeira nota (em azul)?', staff: destacar([primeiro]), opcoes: ops, certa: i, conceito: 'primeira-nota', explica: p1.acc ? `${certa}: lembre-se da armadura, que altera essa nota em todas as oitavas.` : `${certa}.` })
  }
  {
    const ops = DINAMICAS.map((d) => d.nome)
    perguntas.push({ texto: 'Com que intensidade a música começa?', staff, opcoes: ops, certa: DINAMICAS.indexOf(din), conceito: 'dinamica', explica: `O sinal “${din.s}” sob a primeira nota significa ${din.nome}.` })
  }
  {
    const certa = iv.numero === 1 ? 'Uníssono (repete)' : `${NOME_NUMERO[iv.numero]} ${iv.direcao === 'sobe' ? 'subindo' : 'descendo'}`
    const todas = ['Uníssono (repete)', ...[2, 3, 4, 5].flatMap((x) => [`${NOME_NUMERO[x]} subindo`, `${NOME_NUMERO[x]} descendo`])]
    const [ops, i] = opcoes(certa, todas)
    perguntas.push({ texto: 'Qual é o intervalo entre as duas notas em azul?', staff: destacar([idxSom[0], idxSom[1]].map((x) => mel.eventos.slice(0, x + 1).length - 1)), opcoes: ops, certa: i, conceito: 'intervalo', explica: `${nomeP(p1)} → ${nomeP(p2)}: ${certa}.` })
  }
  {
    const certa = String(pausas)
    const [ops, i] = opcoes(certa, ['0', '1', '2', '3', '4', '5'])
    perguntas.push({ texto: 'Quantas pausas há no trecho?', staff, opcoes: ops, certa: i, conceito: 'pausas', explica: pausas ? `Há ${pausas} pausa(s): silêncios medidos, contados como tempo.` : 'Não há pausas neste trecho.' })
  }
  {
    const certa = nomeP(maisAguda)
    const [ops, i] = opcoes(certa, sons.map((e) => nomeP(e.pitch!)))
    if (ops.length >= 2) perguntas.push({ texto: 'Qual é a nota mais aguda do trecho?', staff, opcoes: ops, certa: i, conceito: 'mais-aguda', explica: `A nota mais alta no pentagrama é ${certa}.` })
  }
  return { mel, staff, perguntas, dinamica: din }
}

export default function Desafio() {
  const [d, setD] = useState(gerarDesafio)
  const [k, setK] = useState(0)
  const [resultado, setResultado] = useState<number | null>(null)
  const ouvir = () => tocarSequencia(melodiaParaSom(d.mel).map((x) => ({ ...x, vel: d.dinamica.vel })), { compasso: d.mel.compasso, bpm: d.mel.compasso.tipo === 'composto' ? 56 : 92, acompanhamento: true, tonica: midiP(d.mel.armadura!.tonica) - 12 })
  return (
    <div className="exercise">
      <p className="muted center">Leia a partitura inteira e responda. Depois, ouça para conferir.</p>
      <MultipleChoice
        key={k}
        skill="desafio-partitura"
        fixas={d.perguntas}
        onFim={(ok, total) => {
          const p = Math.round((ok / total) * 100)
          setResultado(p)
          registrar('desafio-partitura', { melhor: p })
        }}
      />
      <div className="row center">
        <button className="btn" onClick={ouvir}>▶ Ouvir a partitura</button>
        <button className="btn primary" onClick={() => { setD(gerarDesafio()); setK((x) => x + 1); setResultado(null) }}>Novo desafio</button>
      </div>
      {resultado !== null && <p className="feedback"><span className={resultado >= 80 ? 'ok' : 'erro'}>Resultado do desafio: {resultado}%</span></p>}
    </div>
  )
}
