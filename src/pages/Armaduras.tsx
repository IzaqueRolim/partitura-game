// Laboratório de acidentes e armaduras de clave, em níveis progressivos.
import MultipleChoice, { type Pergunta } from '../components/MultipleChoice'
import {
  ARMADURAS, NOMES, ORDEM_BEMOIS, ORDEM_SUSTENIDOS, P, SIMBOLO_ACC, VEX_ACC, alteradas, grau, n, naArmadura, nome, nomeP, rand, shuffle,
  toneNameP, vexKey, vexKeyP, type Acc, type Clef, type Pitch,
} from '../music/notes'

export const NIVEIS_ARMADURAS = ['Identifique o acidente', 'Notas com sustenido e bemol', 'Notas alteradas pela armadura', 'Lendo notas com armadura', 'Complete a armadura']

const NOME_ACC: Record<number, string> = { 1: 'Sustenido (♯)', [-1]: 'Bemol (♭)', 0: 'Bequadro (♮)' }
const EXPLICA_ACC: Record<number, string> = {
  1: 'O sustenido sobe a nota meio tom.',
  [-1]: 'O bemol desce a nota meio tom.',
  0: 'O bequadro cancela um acidente anterior e volta à nota natural.',
}
const faixa = (c: Clef) => (c === 'treble' ? [n('d/4'), n('g/5')] : [n('f/2'), n('b/3')])
const somDe = (p: Pitch) => ({ notas: [{ t: 0, dur: 2, notas: [toneNameP(p)] }], opcoes: { bpm: 80 } })

function opcoes(certa: string, todas: string[], qtd = 4): [string[], number] {
  const outras = shuffle([...new Set(todas.filter((x) => x !== certa))]).slice(0, qtd - 1)
  const ops = shuffle([certa, ...outras])
  return [ops, ops.indexOf(certa)]
}

function nivel1(): Pergunta {
  const acc = rand([1, -1, 0] as Acc[])
  const clef = rand(['treble', 'bass'] as Clef[])
  const [lo, hi] = faixa(clef)
  const d = lo + Math.floor(Math.random() * (hi - lo))
  const ops = ['Sustenido (♯)', 'Bemol (♭)', 'Bequadro (♮)']
  return {
    texto: 'Qual acidente está escrito antes desta nota?',
    staff: { clef, measures: [[{ keys: [vexKeyP(P(d, acc))], dur: 'w', acc: VEX_ACC[acc] }]], width: 300 },
    opcoes: ops, certa: ops.indexOf(NOME_ACC[acc]), conceito: 'acidente',
    audio: somDe(P(d, acc)),
    explica: EXPLICA_ACC[acc],
  }
}

function nivel2(): Pergunta {
  const clef = rand(['treble', 'bass'] as Clef[])
  const [lo, hi] = faixa(clef)
  let d = lo + Math.floor(Math.random() * (hi - lo))
  let acc = rand([1, -1] as Acc[])
  const g = grau(d)
  if ((acc === 1 && (g === 2 || g === 6)) || (acc === -1 && (g === 3 || g === 0))) acc = (-acc) as Acc
  const p = P(d, acc)
  const certa = nomeP(p)
  const dist = [nome(d), nome(d) + SIMBOLO_ACC[-acc], nome(d + 1) + SIMBOLO_ACC[acc], nome(d - 1) + SIMBOLO_ACC[acc]]
  const [ops, i] = opcoes(certa, dist)
  d = p.d
  return {
    texto: 'Qual é o nome desta nota?',
    staff: { clef, measures: [[{ keys: [vexKeyP(p)], dur: 'w', acc: VEX_ACC[acc] }]], width: 300 },
    opcoes: ops, certa: i, conceito: 'nota-acidente',
    audio: somDe(p),
    explica: `A nota está na posição de ${nome(d)} e tem ${acc === 1 ? 'sustenido' : 'bemol'}: ${certa}. ${EXPLICA_ACC[acc]}`,
  }
}

const armaduraAte = (max: number) => ARMADURAS.filter((a) => a.qtd > 0 && a.qtd <= max)

function nivel3(): Pergunta {
  const a = rand(armaduraAte(4))
  const alt = alteradas(a)
  const ops = NOMES.map((nm) => nm)
  const ordem = alt.map((g) => NOMES[g] + SIMBOLO_ACC[a.tipo])
  return {
    texto: 'Quais notas esta armadura altera? (marque todas)',
    staff: { clef: rand(['treble', 'bass']), keySig: a.vex, measures: [[]], width: 300 },
    opcoes: ops, certa: alt, multi: true, conceito: 'armadura-' + a.vex,
    explica: `${a.maior} (ou ${a.menor}): ${ordem.join(', ')}. Ordem dos ${a.tipo === 1 ? 'sustenidos: Fá Dó Sol Ré Lá Mi Si' : 'bemóis: Si Mi Lá Ré Sol Dó Fá'}.`,
  }
}

function nivel4(): Pergunta {
  const a = rand(armaduraAte(5))
  if (Math.random() < 0.3) {
    const certa = a.maior
    const [ops, i] = opcoes(certa, ARMADURAS.map((x) => x.maior))
    const dica = a.tipo === 1 ? 'suba meio tom a partir do último sustenido' : a.qtd === 1 ? 'um bemol (Si♭) é sempre Fá maior' : 'o penúltimo bemol dá o nome da tonalidade'
    return {
      texto: 'Qual tonalidade maior tem esta armadura?',
      staff: { clef: 'treble', keySig: a.vex, measures: [[]], width: 300 },
      opcoes: ops, certa: i, conceito: 'tonalidade-' + a.vex,
      explica: `${a.maior} (relativa: ${a.menor}). Truque: ${dica}.`,
    }
  }
  const clef = rand(['treble', 'bass'] as Clef[])
  const [lo, hi] = faixa(clef)
  // na metade das vezes, escolhe de propósito uma nota alterada pela armadura
  const alvoGrau = Math.random() < 0.6 ? rand(alteradas(a)) : Math.floor(Math.random() * 7)
  const cands: number[] = []
  for (let d = lo; d <= hi; d++) if (grau(d) === alvoGrau) cands.push(d)
  const d = rand(cands)
  const p = naArmadura(a, d)
  const certa = nomeP(p)
  const [ops, i] = opcoes(certa, [nome(d), nome(d) + '♯', nome(d) + '♭'], 3)
  return {
    texto: 'Que nota soa aqui, considerando a armadura?',
    staff: { clef, keySig: a.vex, measures: [[{ keys: [vexKey(d)], dur: 'w' }]], width: 320 },
    opcoes: ops, certa: i, conceito: 'leitura-armadura-' + a.vex,
    audio: somDe(p),
    explica: p.acc ? `A armadura de ${a.maior} altera o ${nome(d)}: ele vale ${certa} em qualquer oitava.` : `A armadura de ${a.maior} não altera o ${nome(d)}, então ele continua natural.`,
  }
}

function nivel5(): Pergunta {
  const a = rand(ARMADURAS.filter((x) => x.qtd >= 2))
  const anterior = ARMADURAS.find((x) => x.tipo === a.tipo && x.qtd === a.qtd - 1)!
  const ordem = a.tipo === 1 ? ORDEM_SUSTENIDOS : ORDEM_BEMOIS
  const falta = NOMES[ordem[a.qtd - 1]] + SIMBOLO_ACC[a.tipo]
  const todas = [...ORDEM_SUSTENIDOS.map((g) => NOMES[g] + '♯'), ...ORDEM_BEMOIS.map((g) => NOMES[g] + '♭')]
  const usados = alteradas(anterior).map((g) => NOMES[g] + SIMBOLO_ACC[a.tipo])
  const [ops, i] = opcoes(falta, todas.filter((x) => !usados.includes(x)))
  return {
    texto: `Esta armadura de ${a.maior} está incompleta. Qual acidente falta?`,
    staff: { clef: 'treble', keySig: anterior.vex, measures: [[]], width: 300 },
    depois: { clef: 'treble', keySig: a.vex, measures: [[]], width: 300 },
    opcoes: ops, certa: i, conceito: 'completar-armadura',
    explica: `${a.maior} tem ${a.qtd} ${a.tipo === 1 ? 'sustenidos' : 'bemóis'}: ${alteradas(a).map((g) => NOMES[g] + SIMBOLO_ACC[a.tipo]).join(', ')}. O próximo na ordem é ${falta}.`,
  }
}

const GERADORES = [nivel1, nivel2, nivel3, nivel4, nivel5]
// nos níveis altos, revisa também conteúdos anteriores
const gerar = (nivel: number) => (nivel > 2 && Math.random() < 0.2 ? GERADORES[Math.floor(Math.random() * (nivel - 1))]() : GERADORES[nivel - 1]())

export default function Armaduras() {
  return <MultipleChoice skill="armaduras" niveis={NIVEIS_ARMADURAS} gerar={gerar} />
}
