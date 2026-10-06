// Saltos e intervalos: direção, distância em graus, qualidade, percepção e sequências.
import MultipleChoice, { type Pergunta } from '../components/MultipleChoice'
import type { SNote } from '../components/Staff'
import { P, intervalo, n, nome, rand, shuffle, toneNameP, vexKey, NOME_NUMERO } from '../music/notes'

export const NIVEIS_INTERVALOS = ['Sobe, desce ou repete?', 'Distância: 2ª a 5ª', 'Distância: 2ª a 8ª', 'Maior, menor ou justa', 'Ouça e escolha o escrito', 'Sequências de intervalos']

const LO = n('c/4'), HI = n('a/5')
const nota = (d: number, extra: Partial<SNote> = {}): SNote => ({ keys: [vexKey(d)], dur: 'h', ...extra })
const som = (ds: number[], harmonico = false) => ({
  notas: harmonico ? [{ t: 0, dur: 2, notas: ds.map((d) => toneNameP(P(d))) }] : ds.map((d, i) => ({ t: i * 2, dur: 2, notas: [toneNameP(P(d))] })),
  opcoes: { bpm: 90 },
})
const par = (maxNum: number, minNum = 2): [number, number] => {
  const num = minNum + Math.floor(Math.random() * (maxNum - minNum + 1))
  const sobe = Math.random() < 0.5
  const a = sobe ? LO + Math.floor(Math.random() * (HI - LO - num + 2)) : LO + num - 1 + Math.floor(Math.random() * (HI - LO - num + 2))
  return [a, sobe ? a + num - 1 : a - num + 1]
}
const seta = (dir: string) => (dir === 'sobe' ? '↑' : dir === 'desce' ? '↓' : '=')

function opcoes(certa: string, todas: string[], qtd = 4): [string[], number] {
  const outras = shuffle([...new Set(todas.filter((x) => x !== certa))]).slice(0, qtd - 1)
  const ops = shuffle([certa, ...outras])
  return [ops, ops.indexOf(certa)]
}

function direcao(): Pergunta {
  const tipo = rand(['sobe', 'desce', 'repete'])
  const a = LO + 2 + Math.floor(Math.random() * (HI - LO - 4))
  const b = tipo === 'repete' ? a : tipo === 'sobe' ? a + 1 + Math.floor(Math.random() * 4) : a - 1 - Math.floor(Math.random() * 4)
  const ops = ['Sobe', 'Desce', 'Repete']
  return {
    texto: 'A segunda nota sobe, desce ou repete?',
    staff: { clef: 'treble', measures: [[nota(a), nota(b)]], width: 320 },
    audio: som([a, b]), opcoes: ops, certa: ops.indexOf(tipo[0].toUpperCase() + tipo.slice(1)), conceito: 'direcao',
    explica: tipo === 'repete' ? 'As duas notas estão na mesma linha/espaço: a nota se repete.' : `A segunda nota está mais ${tipo === 'sobe' ? 'alta' : 'baixa'} no pentagrama, então o som ${tipo === 'sobe' ? 'fica mais agudo' : 'fica mais grave'}.`,
  }
}

function distancia(max: number): Pergunta {
  const [a, b] = par(max)
  const iv = intervalo(P(a), P(b))
  const certa = NOME_NUMERO[iv.numero]
  const ops = Array.from({ length: max - 1 }, (_, i) => NOME_NUMERO[i + 2])
  const lista: string[] = []
  for (let d = Math.min(a, b); d <= Math.max(a, b); d++) lista.push(nome(d))
  return {
    texto: 'Qual é a distância (intervalo) entre as duas notas?',
    staff: { clef: 'treble', measures: [[nota(a), nota(b)]], width: 320 },
    audio: som([a, b]), opcoes: ops, certa: ops.indexOf(certa), conceito: 'numero-' + iv.numero,
    explica: `Conte as duas notas e as do meio: ${(a <= b ? lista : [...lista].reverse()).join('-')} = ${lista.length} notas → ${certa}.`,
  }
}

function qualidade(): Pergunta {
  const [a, b] = par(8)
  const iv = intervalo(P(a), P(b))
  const todas = ['2ª menor', '2ª maior', '3ª menor', '3ª maior', '4ª justa', '4ª aumentada (trítono)', '5ª diminuta (trítono)', '5ª justa', '6ª menor', '6ª maior', '7ª menor', '7ª maior', '8ª justa']
  const vizinhas = todas.filter((x) => x.startsWith(String(iv.numero)) || x.startsWith(String(iv.numero - 1)) || x.startsWith(String(iv.numero + 1)))
  const [ops, i] = opcoes(iv.nome, vizinhas)
  return {
    texto: 'Qual é este intervalo?',
    staff: { clef: 'treble', measures: [[nota(a), nota(b)]], width: 320 },
    audio: { ...som([a, b]), notas: [...som([a, b]).notas, { t: 4, dur: 2, notas: [toneNameP(P(a)), toneNameP(P(b))] }] },
    opcoes: ops, certa: i, conceito: iv.curto,
    explica: `${iv.numero}ª com ${iv.semitons} semitons → ${iv.nome}. ${iv.qualidade === 'menor' ? 'O menor tem 1 semitom a menos que o maior.' : ''}`,
  }
}

function auditivo(): Pergunta {
  const a = LO + Math.floor(Math.random() * 5)
  const nums = shuffle([2, 3, 4, 5, 6, 8]).slice(0, 3)
  const certoNum = rand(nums)
  const ops = nums.map((x) => a + x - 1)
  const alvo = a + certoNum - 1
  return {
    texto: 'Ouça o intervalo. Qual pentagrama corresponde ao som?',
    audio: { ...som([a, alvo]), auto: true, rotulo: 'Ouvir o intervalo' },
    opcoes: ops.map((_, i) => `Opção ${i + 1}`),
    opcoesStaff: ops.map((b) => ({ clef: 'treble' as const, measures: [[nota(a), nota(b)]], width: 200 })),
    certa: ops.indexOf(alvo), conceito: 'auditivo-' + certoNum,
    explica: `O som era uma ${NOME_NUMERO[certoNum]} (${nome(a)} → ${nome(alvo)}). Quanto maior o salto no pentagrama, maior a distância entre os sons.`,
  }
}

function sequencia(): Pergunta {
  const ds = [LO + 2 + Math.floor(Math.random() * 6)]
  for (let i = 0; i < 2; i++) {
    let prox = ds[i] + (Math.random() < 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 4))
    prox = Math.max(LO, Math.min(HI, prox))
    if (prox === ds[i]) prox = ds[i] + 2
    ds.push(prox)
  }
  const desc = (x: number[]) => [0, 1].map((i) => { const iv = intervalo(P(x[i]), P(x[i + 1])); return `${NOME_NUMERO[iv.numero]} ${seta(iv.direcao)}` }).join(', ')
  const certa = desc(ds)
  const falsas = new Set<string>()
  for (let t = 0; falsas.size < 3 && t < 40; t++) {
    const k = [...ds]
    k[1 + Math.floor(Math.random() * 2)] += rand([-2, -1, 1, 2])
    const d = desc(k)
    if (d !== certa) falsas.add(d)
  }
  const [ops, i] = opcoes(certa, [...falsas])
  return {
    texto: 'Quais intervalos formam esta sequência?',
    staff: { clef: 'treble', measures: [ds.map((d) => ({ keys: [vexKey(d)], dur: 'q' }))], width: 320 },
    audio: { notas: ds.map((d, j) => ({ t: j, dur: 1, notas: [toneNameP(P(d))] })), opcoes: { bpm: 80 } },
    opcoes: ops, certa: i, conceito: 'sequencia',
    explica: `${nome(ds[0])} → ${nome(ds[1])} → ${nome(ds[2])}: ${certa}.`,
  }
}

const gerar = (nivel: number): Pergunta => {
  // revisão ocasional de níveis anteriores
  const nv = nivel > 2 && Math.random() < 0.2 ? 1 + Math.floor(Math.random() * (nivel - 1)) : nivel
  return [direcao, () => distancia(5), () => distancia(8), qualidade, auditivo, sequencia][nv - 1]()
}

export default function Intervalos() {
  return <MultipleChoice skill="intervalos" niveis={NIVEIS_INTERVALOS} gerar={gerar} />
}
