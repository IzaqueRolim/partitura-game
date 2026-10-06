// Modelo de notas naturais (sem acidentes) baseado em "índice diatônico".
// d = oitava * 7 + grau  (grau: 0=Dó ... 6=Si). Ex.: Dó central (C4) = 28.

export type Clef = 'treble' | 'bass'

export const NOMES = ['Dó', 'Ré', 'Mi', 'Fá', 'Sol', 'Lá', 'Si'] as const
export const LETRAS = ['c', 'd', 'e', 'f', 'g', 'a', 'b'] as const
const SEMITONS = [0, 2, 4, 5, 7, 9, 11]

export const grau = (d: number) => ((d % 7) + 7) % 7
export const oitava = (d: number) => Math.floor(d / 7)
export const nome = (d: number) => NOMES[grau(d)]
export const nomeComOitava = (d: number) => `${nome(d)}${oitava(d)}`

/** chave VexFlow, ex.: "c/4" */
export const vexKey = (d: number) => `${LETRAS[grau(d)]}/${oitava(d)}`
/** nome Tone.js, ex.: "C4" */
export const toneName = (d: number) => `${LETRAS[grau(d)].toUpperCase()}${oitava(d)}`
export const midi = (d: number) => (oitava(d) + 1) * 12 + SEMITONS[grau(d)]

/** converte MIDI -> índice diatônico (null se for tecla preta) */
export function fromMidi(m: number): number | null {
  const pc = m % 12
  const g = SEMITONS.indexOf(pc)
  if (g < 0) return null
  return (Math.floor(m / 12) - 1) * 7 + g
}

/** "c/4" -> 28 */
export function parse(key: string): number {
  const [l, o] = key.split('/')
  return Number(o) * 7 + LETRAS.indexOf(l[0] as (typeof LETRAS)[number])
}

export const n = parse

/** Nota na "linha 0" do VexFlow (uma linha suplementar abaixo do pentagrama). */
export const BASE_LINHA: Record<Clef, number> = { treble: n('c/4'), bass: n('e/2') }

/** posição (em linhas VexFlow, passo 0.5) -> índice diatônico */
export const lineToNote = (clef: Clef, line: number) => BASE_LINHA[clef] + Math.round(line * 2)

/** descrição da posição no pentagrama (para dicas) */
export function posicao(clef: Clef, d: number): string {
  const line = (d - BASE_LINHA[clef]) / 2 // 1 = 1ª linha
  if (line === 0.5) return 'espaço logo abaixo do pentagrama'
  if (line === 5.5) return 'espaço logo acima do pentagrama'
  if (line < 1 || line > 5) {
    const k = line < 1 ? Math.ceil(1 - line) : Math.ceil(line - 5)
    const onde = line < 1 ? 'abaixo' : 'acima'
    return Number.isInteger(line) ? `${k}ª linha suplementar ${onde}` : `espaço entre linhas suplementares ${onde}`
  }
  if (Number.isInteger(line)) return `${line}ª linha`
  return `${Math.floor(line)}º espaço`
}

/**
 * Ordem em que as notas são desbloqueadas no treino (repetição progressiva),
 * como no seu exemplo: começa com Dó-Ré-Mi e vai abrindo o resto.
 */
export const ORDEM_DESBLOQUEIO: Record<Clef, number[]> = {
  treble: ['c/4', 'd/4', 'e/4', 'f/4', 'g/4', 'a/4', 'b/4', 'c/5', 'd/5', 'e/5', 'f/5', 'g/5', 'a/5', 'b/3', 'a/3', 'b/5', 'c/6'].map(n),
  bass: ['c/3', 'd/3', 'e/3', 'f/3', 'g/3', 'a/3', 'b/3', 'c/4', 'b/2', 'a/2', 'g/2', 'f/2', 'e/2', 'd/4', 'e/4', 'd/2', 'c/2'].map(n),
}

/** todas as notas entre duas notas (inclusive) */
export const faixa = (de: string, ate: string) => Array.from({ length: n(ate) - n(de) + 1 }, (_, i) => n(de) + i)

/**
 * Notas do exercício "Que nota é esta?": o pentagrama inteiro + linhas suplementares abaixo
 * (e o espaço logo acima).
 *  Sol: Lá3 (2ª suplementar abaixo) … Sol5 (espaço acima)
 *  Fá:  Dó2 (2ª suplementar abaixo) … Dó4 (Dó central, suplementar acima)
 */
export const NOTAS_QUIZ: Record<Clef, number[]> = {
  treble: faixa('a/3', 'g/5'),
  bass: faixa('c/2', 'c/4'),
}

/** faixas usadas nos exercícios de piano por nível */
export const FAIXAS_PIANO: Record<Clef, [number, number][]> = {
  treble: [
    [n('c/4'), n('g/4')], // nível 1: posição de 5 dedos
    [n('c/4'), n('c/5')], // nível 2: uma oitava
    [n('a/3'), n('g/5')], // nível 3: pentagrama todo
  ],
  bass: [
    [n('c/3'), n('g/3')],
    [n('g/2'), n('c/4')],
    [n('e/2'), n('e/4')],
  ],
}

export const rand = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]
export const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ───────────────────────── Acidentes ─────────────────────────
export type Acc = -2 | -1 | 0 | 1 | 2
/** Altura com acidente: índice diatônico + alteração (♯ = +1, ♭ = -1) */
export interface Pitch { d: number; acc: Acc }

export const SIMBOLO_ACC: Record<number, string> = { [-2]: '𝄫', [-1]: '♭', 0: '', 1: '♯', 2: '𝄪' }
export const VEX_ACC: Record<number, string> = { [-2]: 'bb', [-1]: 'b', 0: 'n', 1: '#', 2: '##' }
const TONE_ACC: Record<number, string> = { [-2]: 'bb', [-1]: 'b', 0: '', 1: '#', 2: '##' }

export const P = (d: number, acc: Acc = 0): Pitch => ({ d, acc })
export const midiP = (p: Pitch) => midi(p.d) + p.acc
export const nomeP = (p: Pitch) => nome(p.d) + SIMBOLO_ACC[p.acc]
export const nomePComOitava = (p: Pitch) => nomeP(p) + oitava(p.d)
/** chave VexFlow com a altura real, ex.: "f#/4" (o símbolo desenhado é controlado à parte) */
export const vexKeyP = (p: Pitch) => `${LETRAS[grau(p.d)]}${p.acc ? TONE_ACC[p.acc] : ''}/${oitava(p.d)}`
export const toneNameP = (p: Pitch) => `${LETRAS[grau(p.d)].toUpperCase()}${TONE_ACC[p.acc]}${oitava(p.d)}`

/** Nome cromático de uma tecla (MIDI): sustenido e bemol quando for tecla preta */
export function nomesMidi(m: number): { sust: string; bem?: string } {
  const nat = fromMidi(m)
  if (nat !== null) return { sust: nome(nat) }
  const abaixo = fromMidi(m - 1)!
  const acima = fromMidi(m + 1)!
  return { sust: nome(abaixo) + '♯', bem: nome(acima) + '♭' }
}

// ───────────────────────── Armaduras de clave ─────────────────────────
/** ordem dos sustenidos: Fá Dó Sol Ré Lá Mi Si / bemóis: Si Mi Lá Ré Sol Dó Fá */
export const ORDEM_SUSTENIDOS = [3, 0, 4, 1, 5, 2, 6]
export const ORDEM_BEMOIS = [6, 2, 5, 1, 4, 0, 3]

export interface Armadura {
  vex: string // especificação VexFlow ("G", "Bb"...)
  maior: string
  menor: string
  tipo: 1 | -1 | 0
  qtd: number
  tonica: Pitch // tônica (oitava 4) da tonalidade maior
}

const arm = (vex: string, maior: string, menor: string, tipo: 1 | -1 | 0, qtd: number, tonica: string, acc: Acc = 0): Armadura =>
  ({ vex, maior, menor, tipo, qtd, tonica: P(n(tonica), acc) })

export const ARMADURAS: Armadura[] = [
  arm('C', 'Dó maior', 'Lá menor', 0, 0, 'c/4'),
  arm('G', 'Sol maior', 'Mi menor', 1, 1, 'g/4'),
  arm('D', 'Ré maior', 'Si menor', 1, 2, 'd/4'),
  arm('A', 'Lá maior', 'Fá♯ menor', 1, 3, 'a/4'),
  arm('E', 'Mi maior', 'Dó♯ menor', 1, 4, 'e/4'),
  arm('B', 'Si maior', 'Sol♯ menor', 1, 5, 'b/4'),
  arm('F#', 'Fá♯ maior', 'Ré♯ menor', 1, 6, 'f/4', 1),
  arm('C#', 'Dó♯ maior', 'Lá♯ menor', 1, 7, 'c/4', 1),
  arm('F', 'Fá maior', 'Ré menor', -1, 1, 'f/4'),
  arm('Bb', 'Si♭ maior', 'Sol menor', -1, 2, 'b/4', -1),
  arm('Eb', 'Mi♭ maior', 'Dó menor', -1, 3, 'e/4', -1),
  arm('Ab', 'Lá♭ maior', 'Fá menor', -1, 4, 'a/4', -1),
  arm('Db', 'Ré♭ maior', 'Si♭ menor', -1, 5, 'd/4', -1),
  arm('Gb', 'Sol♭ maior', 'Mi♭ menor', -1, 6, 'g/4', -1),
  arm('Cb', 'Dó♭ maior', 'Lá♭ menor', -1, 7, 'c/4', -1),
]
export const armadura = (vex: string) => ARMADURAS.find((a) => a.vex === vex)!

/** graus alterados pela armadura, na ordem em que aparecem */
export const alteradas = (a: Armadura) => (a.tipo === 1 ? ORDEM_SUSTENIDOS : ORDEM_BEMOIS).slice(0, a.qtd)
/** acidente que a armadura aplica a um grau */
export const accDaArmadura = (a: Armadura | undefined, g: number): Acc => (a && alteradas(a).includes(g) ? a.tipo : 0)
/** aplica a armadura a uma nota natural */
export const naArmadura = (a: Armadura | undefined, d: number): Pitch => P(d, accDaArmadura(a, grau(d)))

// ───────────────────────── Intervalos ─────────────────────────
export const NOME_NUMERO = ['', 'uníssono', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª', '8ª']
const JUSTOS = new Set([1, 4, 5, 8])
const BASE_SEMITONS = [0, 0, 2, 4, 5, 7, 9, 11, 12] // maior/justo

export interface Intervalo { numero: number; semitons: number; qualidade: string; nome: string; curto: string; direcao: 'sobe' | 'desce' | 'repete' }

export function intervalo(a: Pitch, b: Pitch): Intervalo {
  const numero = Math.abs(b.d - a.d) + 1
  const semitons = Math.abs(midiP(b) - midiP(a))
  const direcao = b.d > a.d ? 'sobe' : b.d < a.d ? 'desce' : midiP(b) === midiP(a) ? 'repete' : midiP(b) > midiP(a) ? 'sobe' : 'desce'
  let qualidade = ''
  let curto = ''
  if (numero <= 8) {
    const dif = semitons - BASE_SEMITONS[numero]
    if (JUSTOS.has(numero)) {
      qualidade = dif === 0 ? 'justa' : dif > 0 ? 'aumentada' : 'diminuta'
      curto = dif === 0 ? 'J' : dif > 0 ? 'aum' : 'dim'
    } else {
      qualidade = dif === 0 ? 'maior' : dif === -1 ? 'menor' : dif > 0 ? 'aumentada' : 'diminuta'
      curto = dif === 0 ? 'M' : dif === -1 ? 'm' : dif > 0 ? 'aum' : 'dim'
    }
  }
  const base = numero === 1 ? 'Uníssono' : NOME_NUMERO[numero] ?? `${numero}ª`
  const nomeQ = numero === 1 ? (semitons === 0 ? 'Uníssono' : 'Uníssono aumentado') : `${base} ${qualidade}`.trim()
  const nomeF = nomeQ + (semitons === 6 ? ' (trítono)' : '')
  return { numero, semitons, qualidade, nome: nomeF, curto: `${numero}${curto}`, direcao }
}

const NOME_MIDI = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
/** MIDI -> nome Tone.js (ex.: 61 -> "C#4") */
export const toneDeMidi = (m: number) => `${NOME_MIDI[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`
/** chave VexFlow ("f#/4") -> nome Tone.js ("F#4") */
export const vexParaTone = (k: string) => {
  const [l, o] = k.split('/')
  return l[0].toUpperCase() + l.slice(1) + o
}
