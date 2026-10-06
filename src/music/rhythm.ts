// Figuras de duração, pausas, fórmulas de compasso e gerador rítmico.
// Todas as durações internas são medidas em SEMÍNIMAS (semínima = 1).
import type { SNote } from '../components/Staff'
import { rand } from './notes'

export type Dur = 'w' | 'h' | 'q' | '8' | '16'

export interface Figura {
  dur: Dur
  dots?: number
  rest?: boolean
}

export const BEATS: Record<Dur, number> = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25 }

export const NOME_FIGURA: Record<Dur, string> = {
  w: 'Semibreve',
  h: 'Mínima',
  q: 'Semínima',
  '8': 'Colcheia',
  '16': 'Semicolcheia',
}

export const beats = (f: Figura) => BEATS[f.dur] * (f.dots ? 1.5 : 1)
export const somaFiguras = (fs: Figura[]) => fs.reduce((s, f) => s + beats(f), 0)

export function nomeFigura(f: Figura): string {
  const base = NOME_FIGURA[f.dur]
  if (f.rest) return `Pausa de ${base.toLowerCase()}${f.dots ? ' pontuada' : ''}`
  return `${base}${f.dots ? ' pontuada' : ''}`
}

export function fmtBeats(b: number): string {
  const inteiro = Math.floor(b)
  const frac = b - inteiro
  const F: Record<number, string> = { 0.25: '¼', 0.5: '½', 0.75: '¾' }
  if (!frac) return String(inteiro)
  return (inteiro ? String(inteiro) : '') + (F[frac] ?? frac.toFixed(2))
}

/** Converte figura -> nota VexFlow numa determinada altura (key). */
export function toSNote(f: Figura, key = 'b/4', extra: Partial<SNote> = {}): SNote {
  return { keys: [f.rest ? 'b/4' : key], dur: f.dur, rest: f.rest, dots: f.dots, ...extra }
}

// ───────────────────────── Fórmulas de compasso ─────────────────────────
export interface Compasso {
  id: string // "6/8"
  num: number
  den: number
  tipo: 'simples' | 'composto'
  nome: string
  descricao: string
}

export const COMPASSOS: Compasso[] = [
  { id: '2/4', num: 2, den: 4, tipo: 'simples', nome: 'Binário simples', descricao: '2 tempos de semínima — marcha' },
  { id: '3/4', num: 3, den: 4, tipo: 'simples', nome: 'Ternário simples', descricao: '3 tempos de semínima — valsa' },
  { id: '4/4', num: 4, den: 4, tipo: 'simples', nome: 'Quaternário simples', descricao: '4 tempos de semínima — o mais comum' },
  { id: '5/4', num: 5, den: 4, tipo: 'simples', nome: 'Quinário (3 + 2)', descricao: '5 tempos de semínima, agrupados 3 + 2' },
  { id: '6/8', num: 6, den: 8, tipo: 'composto', nome: 'Binário composto', descricao: '2 tempos de semínima pontuada (3 colcheias cada)' },
  { id: '9/8', num: 9, den: 8, tipo: 'composto', nome: 'Ternário composto', descricao: '3 tempos de semínima pontuada' },
  { id: '12/8', num: 12, den: 8, tipo: 'composto', nome: 'Quaternário composto', descricao: '4 tempos de semínima pontuada' },
]
export const compasso = (id: string) => COMPASSOS.find((c) => c.id === id) ?? COMPASSOS[2]

/** duração total do compasso, em semínimas */
export const duracaoCompasso = (c: Compasso) => (c.num * 4) / c.den
/** número de pulsos (tempos) por compasso: no composto, cada pulso = 3 colcheias */
export const pulsos = (c: Compasso) => (c.tipo === 'composto' ? c.num / 3 : c.num)
/** duração de um pulso, em semínimas */
export const valorPulso = (c: Compasso) => (c.tipo === 'composto' ? 1.5 : 4 / c.den)
/** força de cada pulso: 2 = forte (1º tempo), 1 = meio-forte, 0 = fraco */
export function acentos(c: Compasso): number[] {
  const p = pulsos(c)
  const a = Array.from({ length: p }, () => 0)
  a[0] = 2
  if (p === 4) a[2] = 1
  if (c.id === '5/4') a[3] = 1
  return a
}
/** grupos internos usados pelo gerador (em semínimas), respeitando a acentuação */
function grupos(c: Compasso): number[] {
  if (c.tipo === 'composto') return Array.from({ length: pulsos(c) }, () => 1.5)
  return { 2: [2], 3: [3], 4: [2, 2], 5: [3, 2] }[c.num] ?? Array.from({ length: c.num }, () => 1)
}

/** descreve uma duração na unidade do compasso (tempos ou colcheias) */
export function fmtDuracao(semin: number, c?: Compasso): string {
  if (c?.tipo === 'composto') {
    const col = semin * 2
    return `${fmtBeats(col)} colcheia${col === 1 ? '' : 's'}`
  }
  return `${fmtBeats(semin)} tempo${semin === 1 ? '' : 's'}`
}

// ───────────────────────── Gerador rítmico ─────────────────────────
const f = (dur: Dur, dots = 0, rest = false): Figura => ({ dur, dots: dots || undefined, rest: rest || undefined })

/** Células rítmicas por duração (em semínimas) e por nível (acumulativas). */
const CELULAS_SIMPLES: Record<number, Figura[][][]> = {
  1: [
    [[f('q')]],
    [[f('8'), f('8')], [f('q', 0, true)]],
    [[f('16'), f('16'), f('16'), f('16')], [f('8'), f('16'), f('16')], [f('16'), f('16'), f('8')], [f('8', 0, true), f('8')]],
  ],
  2: [[[f('h')]], [[f('h', 0, true)]], [[f('q', 1), f('8')]]],
  3: [[[f('h', 1)]], [], []],
  4: [[[f('w')]], [], []],
}
const CELULAS_COMPOSTAS: Record<number, Figura[][][]> = {
  1.5: [
    [[f('q', 1)], [f('q'), f('8')], [f('8'), f('8'), f('8')]],
    [[f('8'), f('q')], [f('q', 1, true)], [f('q'), f('8', 0, true)], [f('8', 0, true), f('8'), f('8')]],
    [[f('16'), f('16'), f('8'), f('8')], [f('8'), f('16'), f('16'), f('8')], [f('8', 1), f('16'), f('8')], [f('8'), f('8'), f('16'), f('16')]],
  ],
  3: [[[f('h', 1)]], [], []],
}

function celulas(tabela: Record<number, Figura[][][]>, dur: number, nivel: number): Figura[][] {
  const porNivel = tabela[dur]
  if (!porNivel) return []
  return porNivel.slice(0, Math.max(1, Math.min(nivel, 3))).flat()
}

/** preenche um grupo de duração `g` dividindo-o em partes que existem na tabela */
function preencher(g: number, nivel: number, composto: boolean): Figura[] {
  const tab = composto ? CELULAS_COMPOSTAS : CELULAS_SIMPLES
  const inteiras = celulas(tab, g, nivel)
  // às vezes usa a figura longa do grupo inteiro; senão divide
  const podeDividir = composto ? g > 1.5 : g > 1
  if (inteiras.length && (!podeDividir || Math.random() < (nivel === 1 ? 0.35 : 0.2))) return [...rand(inteiras)]
  if (!podeDividir) return [...rand(inteiras)]
  const passo = composto ? 1.5 : 1
  const partes: number[] = g === 3 && !composto ? rand([[2, 1], [1, 2], [1, 1, 1]]) : Array.from({ length: Math.round(g / passo) }, () => passo)
  return partes.flatMap((p) => preencher(p, nivel, composto))
}

/**
 * Gera um compasso que respeita a fórmula: soma exata e agrupamento por pulsos
 * (no composto, cada pulso de semínima pontuada é preenchido separadamente).
 * `alvo` pode ser uma fórmula ou, por compatibilidade, um total de semínimas (compasso simples).
 */
export function gerarCompasso(nivel: number, alvo: Compasso | number = 4): Figura[] {
  const c = typeof alvo === 'number' ? { ...compasso('4/4'), num: alvo, id: `${alvo}/4` } : alvo
  const composto = c.tipo === 'composto'
  const total = duracaoCompasso(c)
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    let out: Figura[]
    if (!composto && c.num === 4 && Math.random() < (nivel === 1 ? 0.15 : 0.06)) out = [f('w')]
    else {
      const gs = grupos(c)
      out = []
      for (let i = 0; i < gs.length; i++) {
        // no composto, às vezes une dois pulsos numa mínima pontuada
        if (composto && i + 1 < gs.length && i % 2 === 0 && Math.random() < 0.18) {
          out.push(f('h', 1))
          i++
        } else out.push(...preencher(gs[i], nivel, composto))
      }
    }
    // validações: soma exata e compasso que não seja só pausa
    if (Math.abs(somaFiguras(out) - total) < 1e-9 && out.some((x) => !x.rest)) return out
  }
  return composto ? grupos(c).map(() => f('q', 1)) : grupos(c).flatMap((g) => Array.from({ length: g }, () => f('q')))
}

export interface Evento {
  inicio: number // em semínimas, a partir do início do 1º compasso
  figura: Figura
  nota?: number // índice diatônico (modo melodia)
  medida: number
  idx: number // índice dentro do compasso
}

export function eventos(compassos: Figura[][]): Evento[] {
  const ev: Evento[] = []
  let t = 0
  compassos.forEach((c, m) =>
    c.forEach((fig, i) => {
      ev.push({ inicio: t, figura: fig, medida: m, idx: i })
      t += beats(fig)
    }),
  )
  return ev
}

/** Paleta de figuras e pausas usadas no construtor de compassos e nos quizzes */
export const PALETA: Figura[] = [
  f('w'), f('h', 1), f('h'), f('q', 1), f('q'), f('8', 1), f('8'), f('16'),
  f('w', 0, true), f('h', 0, true), f('q', 0, true), f('8', 0, true), f('16', 0, true),
]
