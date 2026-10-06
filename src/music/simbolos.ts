// Dicionário de símbolos musicais: representação (pentagrama), explicação, uso e demonstração sonora.
import type { SNote, StaffProps } from '../components/Staff'
import type { NotaTocada, OpcoesTocar } from './player'
import { compasso } from './rhythm'

export interface Simbolo {
  id: string
  nome: string
  categoria: string
  staff: StaffProps
  explica: string
  uso: string
  curto: string // definição curta, usada no quiz
  som?: NotaTocada[]
  contraste?: { rotulo: string; notas: NotaTocada[] }
  opcoesSom?: OpcoesTocar
}

export const CATEGORIAS = ['Dinâmica', 'Articulação', 'Andamento e expressão', 'Repetição e fermata', 'Ligaduras e duração', 'Leitura e organização']

const q = (k: string, extra: Partial<SNote> = {}): SNote => ({ keys: [k], dur: 'q', ...extra })
const ESCALA = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']
/** sequência de semínimas com intensidade/duração configuráveis por nota */
const seq = (notas: string[], vel: (i: number) => number = () => 0.7, dur: (i: number) => number = () => 1, t: (i: number) => number = (i) => i): NotaTocada[] =>
  notas.map((nt, i) => ({ t: t(i), dur: dur(i), notas: [nt], vel: vel(i) }))
const comp = (ks: string[], f: (s: SNote, i: number) => SNote = (s) => s) => ks.map((k, i) => f(q(k), i))
const K4 = ['c/4', 'd/4', 'e/4', 'f/4']
const K8 = ['c/4', 'd/4', 'e/4', 'f/4', 'g/4', 'a/4', 'b/4', 'c/5']
const base = (measures: SNote[][], extra: Partial<StaffProps> = {}): StaffProps => ({ clef: 'treble', time: '4/4', measures, width: 380, height: 150, y: 25, ...extra })

export const SIMBOLOS: Simbolo[] = [
  // ── Dinâmica
  {
    id: 'piano', nome: 'Piano (p)', categoria: 'Dinâmica', curto: 'Tocar suave, com pouca intensidade',
    staff: base([comp(K4, (s, i) => (i === 0 ? { ...s, dyn: 'p' } : s))]),
    explica: 'Indica que o trecho deve ser tocado com pouca intensidade (suave). Variações: pp (pianíssimo, muito suave) e mp (meio piano).',
    uso: 'Começos calmos, acompanhamentos e momentos íntimos.',
    som: seq(ESCALA.slice(0, 4), () => 0.35), contraste: { rotulo: 'Comparar com forte', notas: seq(ESCALA.slice(0, 4), () => 0.95) },
  },
  {
    id: 'forte', nome: 'Forte (f)', categoria: 'Dinâmica', curto: 'Tocar com intensidade, forte',
    staff: base([comp(K4, (s, i) => (i === 0 ? { ...s, dyn: 'f' } : s))]),
    explica: 'Indica intensidade forte. Variações: ff (fortíssimo) e mf (meio forte, a intensidade "normal").',
    uso: 'Clímax, refrões e momentos de energia.',
    som: seq(ESCALA.slice(0, 4), () => 0.95), contraste: { rotulo: 'Comparar com piano', notas: seq(ESCALA.slice(0, 4), () => 0.35) },
  },
  {
    id: 'mf', nome: 'Mezzo forte (mf) e mezzo piano (mp)', categoria: 'Dinâmica', curto: 'Intensidades intermediárias',
    staff: base([comp(K4, (s, i) => (i === 0 ? { ...s, dyn: 'mp' } : s)), comp(K4, (s, i) => (i === 0 ? { ...s, dyn: 'mf' } : s))], { width: 520 }),
    explica: '"Mezzo" significa meio: mp é meio suave e mf é meio forte. Ficam entre o p e o f.',
    uso: 'Indicam nuances sem os extremos.',
    som: [...seq(ESCALA.slice(0, 4), () => 0.5), ...seq(ESCALA.slice(0, 4), () => 0.72, () => 1, (i) => 4 + i)],
  },
  {
    id: 'crescendo', nome: 'Crescendo (<)', categoria: 'Dinâmica', curto: 'Aumentar a intensidade aos poucos',
    staff: base([comp(K4, (s, i) => (i === 0 ? { ...s, dyn: 'p' } : s)), comp(['g/4', 'a/4', 'b/4', 'c/5'], (s, i) => (i === 3 ? { ...s, dyn: 'f' } : s))], { width: 520, hairpins: [{ de: 0, ate: 7, tipo: 'cresc' }] }),
    explica: 'O "funil" que se abre indica aumentar a intensidade gradualmente. Também aparece escrito como "cresc."',
    uso: 'Preparar a chegada de um momento forte.',
    som: seq(ESCALA, (i) => 0.25 + i * 0.1),
  },
  {
    id: 'diminuendo', nome: 'Diminuendo / decrescendo (>)', categoria: 'Dinâmica', curto: 'Diminuir a intensidade aos poucos',
    staff: base([comp(['c/5', 'b/4', 'a/4', 'g/4'], (s, i) => (i === 0 ? { ...s, dyn: 'f' } : s)), comp(['f/4', 'e/4', 'd/4', 'c/4'], (s, i) => (i === 3 ? { ...s, dyn: 'p' } : s))], { width: 520, hairpins: [{ de: 0, ate: 7, tipo: 'dim' }] }),
    explica: 'O "funil" que se fecha indica diminuir a intensidade gradualmente. Também aparece como "dim." ou "decresc."',
    uso: 'Finais de frase e encerramentos.',
    som: seq([...ESCALA].reverse(), (i) => 0.95 - i * 0.09),
  },
  // ── Articulação
  {
    id: 'staccato', nome: 'Staccato (ponto sobre/sob a nota)', categoria: 'Articulação', curto: 'Nota curta e destacada',
    staff: base([comp(K4, (s) => ({ ...s, artic: ['a.'] }))]),
    explica: 'O ponto em cima ou embaixo da cabeça da nota indica que ela deve soar curta e separada das outras. Não confunda com o ponto de aumento, que fica ao lado.',
    uso: 'Passagens leves, saltitantes ou brincalhonas.',
    som: seq(ESCALA.slice(0, 4), () => 0.75, () => 0.2), contraste: { rotulo: 'Comparar com legato', notas: seq(ESCALA.slice(0, 4), () => 0.7, () => 1.05) },
  },
  {
    id: 'legato', nome: 'Legato (ligadura de expressão)', categoria: 'Articulação', curto: 'Notas ligadas, sem interrupção',
    staff: base([comp(K4)], { ligaduras: [{ de: 0, ate: 3, tipo: 'slur' }] }),
    explica: 'Uma curva sobre notas diferentes indica tocá-las ligadas, sem silêncio entre elas. Diferente da ligadura de valor, que une notas iguais.',
    uso: 'Melodias cantadas e frases expressivas.',
    som: seq(ESCALA.slice(0, 4), () => 0.7, () => 1.05), contraste: { rotulo: 'Comparar com staccato', notas: seq(ESCALA.slice(0, 4), () => 0.75, () => 0.2) },
  },
  {
    id: 'acento', nome: 'Acento (>)', categoria: 'Articulação', curto: 'Nota com mais ênfase que as vizinhas',
    staff: base([comp(K4, (s, i) => (i % 2 === 0 ? { ...s, artic: ['a>'] } : s))]),
    explica: 'O sinal ">" sobre ou sob a nota pede que ela seja tocada com mais força que as notas ao redor.',
    uso: 'Destacar notas importantes ou criar balanço rítmico.',
    som: seq(ESCALA.slice(0, 4), (i) => (i % 2 === 0 ? 1 : 0.4)),
  },
  {
    id: 'tenuto', nome: 'Tenuto (–)', categoria: 'Articulação', curto: 'Sustentar a nota por todo o seu valor',
    staff: base([comp(K4, (s) => ({ ...s, artic: ['a-'] }))]),
    explica: 'O pequeno traço horizontal pede que a nota seja sustentada por toda a sua duração, com leve peso.',
    uso: 'Notas que precisam "cantar" um pouco mais.',
    som: seq(ESCALA.slice(0, 4), () => 0.78, () => 1),
  },
  // ── Andamento e expressão
  {
    id: 'andamento', nome: 'Indicação de andamento', categoria: 'Andamento e expressão', curto: 'Velocidade da música (ex.: Allegro, ♩ = 120)',
    staff: base([comp(K8.slice(0, 4)), comp(K8.slice(4))], { width: 520, tempo: { nome: 'Allegro', bpm: 132 } }),
    explica: 'Escrita acima do primeiro compasso, indica a velocidade. Pode ser uma palavra italiana e/ou a marcação de metrônomo (♩ = batidas por minuto). Do mais lento ao mais rápido: Largo, Adagio, Andante, Moderato, Allegro, Presto.',
    uso: 'Sempre no início da peça ou quando o andamento muda.',
    som: seq(ESCALA), opcoesSom: { bpm: 132 },
    contraste: { rotulo: 'Comparar com Adagio (♩ = 66)', notas: seq(ESCALA, () => 0.7, () => 2, (i) => i * 2) },
  },
  {
    id: 'ritardando', nome: 'Ritardando (rit.)', categoria: 'Andamento e expressão', curto: 'Ir diminuindo a velocidade',
    staff: base([comp(K8.slice(0, 4)), comp(K8.slice(4), (s, i) => (i === 0 ? { ...s, labelTop: 'rit.' } : s))], { width: 520 }),
    explica: '"rit." ou "rall." indica desacelerar aos poucos. O contrário é "accel." (accelerando), acelerar aos poucos. "a tempo" volta ao andamento original.',
    uso: 'Finais de seção e de música.',
    som: (() => { let t = 0; return ESCALA.map((nt, i) => { const d = i < 4 ? 1 : 1 + (i - 3) * 0.35; const x = { t, dur: d, notas: [nt], vel: 0.7 }; t += d; return x }) })(),
  },
  {
    id: 'expressao', nome: 'Termos de expressão', categoria: 'Andamento e expressão', curto: 'Palavras que indicam o caráter (dolce, cantabile…)',
    staff: base([comp(K4, (s, i) => (i === 0 ? { ...s, labelTop: 'dolce' } : s))]),
    explica: 'Palavras (geralmente em italiano) que descrevem o caráter: dolce (doce), cantabile (cantando), espressivo, con brio (com vivacidade), maestoso (majestoso).',
    uso: 'Orientam a interpretação, não só a técnica.',
    som: seq(ESCALA.slice(0, 4), () => 0.45, () => 1.05),
  },
  // ── Repetição e fermata
  {
    id: 'fermata', nome: 'Fermata (𝄐)', categoria: 'Repetição e fermata', curto: 'Sustentar a nota além do seu valor',
    staff: base([[q('c/4'), q('e/4'), { keys: ['g/4'], dur: 'h', artic: ['a@a'] }]]),
    explica: 'O "olho" sobre a nota pede que ela seja prolongada além do seu valor, à vontade do intérprete. O tempo "para" e depois continua.',
    uso: 'Finais e pontos de suspensão.',
    som: [{ t: 0, dur: 1, notas: ['C4'] }, { t: 1, dur: 1, notas: ['E4'] }, { t: 2, dur: 2, notas: ['G4'], art: 'fermata' }],
  },
  {
    id: 'repeticao', nome: 'Barras de repetição', categoria: 'Repetição e fermata', curto: 'Repetir o trecho entre as barras',
    staff: base([comp(K4), comp(['g/4', 'f/4', 'e/4', 'd/4'])], { width: 520, repeticao: { inicio: true, fim: true } }),
    explica: 'Barra dupla com dois pontos. O trecho entre a barra de início (pontos à direita) e a de fim (pontos à esquerda) é tocado duas vezes. Sem barra de início, volta ao começo.',
    uso: 'Evitam escrever de novo trechos iguais.',
    som: [...seq(['C4', 'D4', 'E4', 'F4', 'G4', 'F4', 'E4', 'D4']), ...seq(['C4', 'D4', 'E4', 'F4', 'G4', 'F4', 'E4', 'D4'], () => 0.7, () => 1, (i) => 8 + i)],
  },
  {
    id: 'dacapo', nome: 'D.C., D.S., Fine e Coda', categoria: 'Repetição e fermata', curto: 'Indicações de "volte para…" e "fim"',
    staff: base([comp(K4), comp(['g/4', 'e/4', 'c/4', 'c/4'], (s, i) => (i === 3 ? { ...s, labelTop: 'D.C. al Fine' } : s))], { width: 520 }),
    explica: 'D.C. (da capo) = volte ao início. D.S. (dal segno) = volte ao sinal 𝄋. Fine = fim. Coda (𝄌) = salte para o final indicado. "D.C. al Fine" = volte ao início e termine no Fine.',
    uso: 'Organizar a forma da música sem reescrever seções.',
  },
  // ── Ligaduras e duração
  {
    id: 'ligadura-valor', nome: 'Ligadura de valor', categoria: 'Ligaduras e duração', curto: 'Une duas notas iguais somando as durações',
    staff: base([[q('g/4'), q('g/4'), { keys: ['g/4'], dur: 'h' }], [{ keys: ['g/4'], dur: 'h' }, q('e/4'), q('c/4')]], { width: 520, ligaduras: [{ de: 2, ate: 3, tipo: 'tie' }] }),
    explica: 'Curva entre duas notas da MESMA altura: a segunda não é tocada de novo, apenas prolongada. Permite atravessar a barra de compasso.',
    uso: 'Notas longas que passam de um compasso para o outro.',
    som: [{ t: 0, dur: 1, notas: ['G4'] }, { t: 1, dur: 1, notas: ['G4'] }, { t: 2, dur: 4, notas: ['G4'] }, { t: 6, dur: 1, notas: ['E4'] }, { t: 7, dur: 1, notas: ['C4'] }],
  },
  {
    id: 'ponto', nome: 'Ponto de aumento', categoria: 'Ligaduras e duração', curto: 'Aumenta metade do valor da figura',
    staff: base([[{ keys: ['e/4'], dur: 'h', dots: 1 }, q('g/4')], [{ keys: ['c/5'], dur: 'q', dots: 1 }, { keys: ['b/4'], dur: '8' }, { keys: ['a/4'], dur: 'h' }]], { width: 520 }),
    explica: 'O ponto ao lado da nota soma metade do valor dela: mínima pontuada = 3 tempos; semínima pontuada = 1½ tempo.',
    uso: 'Ritmos "longo-curto" muito comuns em melodias.',
    som: [{ t: 0, dur: 3, notas: ['E4'] }, { t: 3, dur: 1, notas: ['G4'] }, { t: 4, dur: 1.5, notas: ['C5'] }, { t: 5.5, dur: 0.5, notas: ['B4'] }, { t: 6, dur: 2, notas: ['A4'] }],
  },
  {
    id: 'suplementares', nome: 'Linhas suplementares', categoria: 'Ligaduras e duração', curto: 'Pequenas linhas para notas fora do pentagrama',
    staff: base([[q('a/3'), q('c/4'), q('a/5'), q('c/6')]], { time: null }),
    explica: 'Pequenas linhas acima ou abaixo do pentagrama ampliam a extensão. Conte-as como continuação das linhas e espaços.',
    uso: 'Notas muito agudas ou muito graves, como o Dó central na clave de Sol.',
    som: seq(['A3', 'C4', 'A5', 'C6']),
  },
  // ── Leitura e organização
  {
    id: 'barras', nome: 'Barras de compasso e barra final', categoria: 'Leitura e organização', curto: 'Separam compassos; a barra dupla grossa encerra',
    staff: base([comp(K4), comp(['g/4', 'e/4', 'd/4', 'c/4'])], { width: 520 }),
    explica: 'A barra simples separa compassos. A barra dupla fina separa seções. A barra final (fina + grossa) encerra a música.',
    uso: 'Organizam a leitura e mostram onde começa cada compasso.',
    som: seq(['C4', 'D4', 'E4', 'F4', 'G4', 'E4', 'D4', 'C4']),
  },
  {
    id: 'armadura', nome: 'Armadura de clave', categoria: 'Leitura e organização', curto: 'Acidentes fixos para toda a música',
    staff: base([[q('f/4'), q('g/4'), q('a/4'), q('f/5')]], { keySig: 'G', time: null }),
    explica: 'Sustenidos ou bemóis escritos logo após a clave valem para todas as notas daquele nome, em qualquer oitava. Aqui (Sol maior) todo Fá é Fá♯.',
    uso: 'Indica a tonalidade da música.',
    som: seq(['F#4', 'G4', 'A4', 'F#5']),
  },
  {
    id: 'formula', nome: 'Fórmula de compasso', categoria: 'Leitura e organização', curto: 'Quantos tempos e qual figura vale 1 tempo',
    staff: base([[{ keys: ['c/5'], dur: '8' }, { keys: ['b/4'], dur: '8' }, { keys: ['a/4'], dur: '8' }, { keys: ['g/4'], dur: 'q', dots: 1 }]], { time: '6/8' }),
    explica: 'Os dois números após a clave: o de cima diz quantas figuras há por compasso; o de baixo, qual figura é contada (4 = semínima, 8 = colcheia).',
    uso: 'Define a pulsação e o agrupamento dos tempos.',
    som: [{ t: 0, dur: 0.5, notas: ['C5'] }, { t: 0.5, dur: 0.5, notas: ['B4'] }, { t: 1, dur: 0.5, notas: ['A4'] }, { t: 1.5, dur: 1.5, notas: ['G4'] }],
    opcoesSom: { metronomo: true, bpm: 60, compasso: compasso('6/8') },
  },
]
