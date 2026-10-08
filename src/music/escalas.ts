// Escalas: fórmulas em semitons + graus (para a grafia correta das notas), construção em qualquer tônica,
// descrição dos passos (tom/semitom) e graus com alterações (1 2 ♭3 …).
import { type Acc, type Pitch, midi, midiP, n, NOMES, P, SIMBOLO_ACC, grau, toneNameP } from './notes'

export type Familia = 'maior' | 'menor' | 'blues' | 'jazz'

export interface Escala {
  id: string
  nome: string
  familia: Familia
  semitons: number[] // distância de cada nota até a tônica
  graus: number[] // grau diatônico de cada nota (0 = tônica), define a letra usada na grafia
  caracter: string // como soa
  explica: string // como se constrói / o que a distingue
  uso: string
  tonicaPadrao: string // tônica usada nos exemplos (vex key)
}

export const ESCALAS: Escala[] = [
  {
    id: 'maior', nome: 'Maior', familia: 'maior', semitons: [0, 2, 4, 5, 7, 9, 11], graus: [0, 1, 2, 3, 4, 5, 6], tonicaPadrao: 'c/4',
    caracter: 'Alegre, luminosa, estável.',
    explica: 'Sequência de tons (T) e semitons (S): T T S T T T S. Os semitons ficam entre o 3º e o 4º grau e entre o 7º e a oitava.',
    uso: 'A base da música ocidental: hinos, canções infantis, pop, música clássica.',
  },
  {
    id: 'menor-natural', nome: 'Menor natural', familia: 'menor', semitons: [0, 2, 3, 5, 7, 8, 10], graus: [0, 1, 2, 3, 4, 5, 6], tonicaPadrao: 'a/4',
    caracter: 'Melancólica, introspectiva.',
    explica: 'T S T T S T T. Comparada à maior de mesma tônica, tem 3ª, 6ª e 7ª abaixadas (♭3, ♭6, ♭7). Usa as mesmas notas da maior relativa (Lá menor = notas de Dó maior).',
    uso: 'Baladas, rock, música folclórica, trilhas sonoras.',
  },
  {
    id: 'menor-harmonica', nome: 'Menor harmônica', familia: 'menor', semitons: [0, 2, 3, 5, 7, 8, 11], graus: [0, 1, 2, 3, 4, 5, 6], tonicaPadrao: 'a/4',
    caracter: 'Dramática, com sabor "oriental".',
    explica: 'É a menor natural com a 7ª elevada (sensível), que fica a um semitom da tônica. Entre a 6ª e a 7ª surge um salto de 1½ tom (T S T T S 1½T S).',
    uso: 'Música clássica, flamenco, música árabe e do Leste Europeu, metal neoclássico.',
  },
  {
    id: 'menor-melodica', nome: 'Menor melódica', familia: 'menor', semitons: [0, 2, 3, 5, 7, 9, 11], graus: [0, 1, 2, 3, 4, 5, 6], tonicaPadrao: 'a/4',
    caracter: 'Suave e elegante; menor no começo, maior no fim.',
    explica: 'Menor natural com a 6ª e a 7ª elevadas: T S T T T T S. Na música clássica, ao descer volta a ser menor natural; no jazz é usada igual nos dois sentidos ("menor jazz").',
    uso: 'Melodias clássicas ascendentes e improviso de jazz.',
  },
  {
    id: 'pentatonica-maior', nome: 'Pentatônica maior', familia: 'blues', semitons: [0, 2, 4, 7, 9], graus: [0, 1, 2, 4, 5], tonicaPadrao: 'c/4',
    caracter: 'Aberta, alegre, sem tensões.',
    explica: 'Cinco notas: a escala maior sem o 4º e o 7º grau (1 2 3 5 6). Sem semitons, quase nada soa "errado".',
    uso: 'Folk, country, pop, música oriental, base do blues maior.',
  },
  {
    id: 'pentatonica-menor', nome: 'Pentatônica menor', familia: 'blues', semitons: [0, 3, 5, 7, 10], graus: [0, 2, 3, 4, 6], tonicaPadrao: 'a/4',
    caracter: 'Forte e direta, cheia de atitude.',
    explica: 'Cinco notas: 1 ♭3 4 5 ♭7. É a menor natural sem o 2º e o 6º grau.',
    uso: 'Rock, blues, solos de guitarra, R&B.',
  },
  {
    id: 'blues', nome: 'Blues (menor)', familia: 'blues', semitons: [0, 3, 5, 6, 7, 10], graus: [0, 2, 3, 4, 4, 6], tonicaPadrao: 'a/4',
    caracter: 'O som do blues: arrastado e expressivo.',
    explica: 'Pentatônica menor + a "blue note" (♭5) entre o 4º e o 5º grau: 1 ♭3 4 ♭5 5 ♭7.',
    uso: 'Blues, rock, jazz, soul.',
  },
  {
    id: 'blues-maior', nome: 'Blues maior', familia: 'blues', semitons: [0, 2, 3, 4, 7, 9], graus: [0, 1, 2, 2, 4, 5], tonicaPadrao: 'c/4',
    caracter: 'Alegre e "suingada".',
    explica: 'Pentatônica maior + a ♭3 como nota de passagem: 1 2 ♭3 3 5 6.',
    uso: 'Blues maior, country, gospel, rock dos anos 50.',
  },
  {
    id: 'dorico', nome: 'Dórico', familia: 'jazz', semitons: [0, 2, 3, 5, 7, 9, 10], graus: [0, 1, 2, 3, 4, 5, 6], tonicaPadrao: 'd/4',
    caracter: 'Menor, mas luminoso.',
    explica: 'Menor natural com a 6ª maior: 1 2 ♭3 4 5 6 ♭7 (T S T T T S T). Em Ré, são as teclas brancas de Ré a Ré.',
    uso: 'Acordes menores com 7ª no jazz (ii do ii–V–I), funk, "So What" de Miles Davis.',
  },
  {
    id: 'mixolidio', nome: 'Mixolídio', familia: 'jazz', semitons: [0, 2, 4, 5, 7, 9, 10], graus: [0, 1, 2, 3, 4, 5, 6], tonicaPadrao: 'g/4',
    caracter: 'Maior com um toque de blues.',
    explica: 'Escala maior com a 7ª menor: 1 2 3 4 5 6 ♭7 (T T S T T S T). Em Sol, são as teclas brancas de Sol a Sol.',
    uso: 'Acordes dominantes (V7), rock, baião e forró.',
  },
  {
    id: 'lidio', nome: 'Lídio', familia: 'jazz', semitons: [0, 2, 4, 6, 7, 9, 11], graus: [0, 1, 2, 3, 4, 5, 6], tonicaPadrao: 'f/4',
    caracter: 'Maior, aberto e "flutuante".',
    explica: 'Escala maior com a 4ª aumentada (♯4): 1 2 3 ♯4 5 6 7. Em Fá, são as teclas brancas de Fá a Fá.',
    uso: 'Acordes maiores com 7ª maior no jazz, trilhas de cinema.',
  },
  {
    id: 'bebop', nome: 'Bebop dominante', familia: 'jazz', semitons: [0, 2, 4, 5, 7, 9, 10, 11], graus: [0, 1, 2, 3, 4, 5, 6, 6], tonicaPadrao: 'g/4',
    caracter: 'Fluida, típica dos solos de jazz.',
    explica: 'Mixolídio com uma nota de passagem cromática entre a ♭7 e a 7: 1 2 3 4 5 6 ♭7 7. Com 8 notas, os tempos fortes caem sempre nas notas do acorde.',
    uso: 'Improviso de bebop (Charlie Parker, Dizzy Gillespie).',
  },
  {
    id: 'tons-inteiros', nome: 'Tons inteiros', familia: 'jazz', semitons: [0, 2, 4, 6, 8, 10], graus: [0, 1, 2, 3, 4, 5], tonicaPadrao: 'c/4',
    caracter: 'Misteriosa, como um sonho.',
    explica: 'Seis notas, todas separadas por um tom (T T T T T T). Não tem semitons nem tônica clara.',
    uso: 'Debussy, Thelonious Monk, efeitos de "sonho" no cinema.',
  },
]
export const escala = (id: string) => ESCALAS.find((e) => e.id === id)!
export const NOMES_FAMILIA: Record<Familia, string> = { maior: 'Maior', menor: 'Menores', blues: 'Pentatônicas e blues', jazz: 'Jazz' }

/** tônicas oferecidas (oitava 4), com grafia comum */
export const TONICAS: Pitch[] = [
  P(n('c/4')), P(n('g/4')), P(n('d/4')), P(n('a/4')), P(n('e/4')), P(n('b/4')),
  P(n('f/4')), P(n('b/4'), -1), P(n('e/4'), -1), P(n('a/4'), -1), P(n('d/4'), -1), P(n('f/4'), 1), P(n('c/4'), 1),
]

/** constrói a escala a partir da tônica, com a grafia correta (cada grau usa a sua letra) */
export function construir(e: Escala, tonica: Pitch, comOitava = true): Pitch[] {
  const base = midiP(tonica)
  const notas = e.semitons.map((s, i) => {
    const d = tonica.d + e.graus[i]
    const acc = base + s - midi(d)
    return P(d, acc as Acc)
  })
  return comOitava ? [...notas, P(tonica.d + 7, tonica.acc)] : notas
}

/** a grafia usa só ♯/♭ simples (sem 𝄪/𝄫)? — boa para quem está começando */
export const grafiaSimples = (ps: Pitch[]) => ps.every((p) => Math.abs(p.acc) <= 1)

/** tônicas que geram uma grafia simples para essa escala */
export const tonicasPara = (e: Escala) => TONICAS.filter((t) => grafiaSimples(construir(e, t)))

const PASSO: Record<number, string> = { 1: 'S', 2: 'T', 3: '1½T', 4: '2T' }
/** distância entre notas vizinhas (inclui a volta à oitava) */
export function passos(e: Escala): string[] {
  const s = [...e.semitons, 12]
  return s.slice(1).map((x, i) => PASSO[x - s[i]] ?? `${x - s[i]}S`)
}

/** nome dos graus com alteração em relação à escala maior (1 2 ♭3 …) */
export function rotulosGraus(e: Escala): string[] {
  const MAIOR = [0, 2, 4, 5, 7, 9, 11]
  return e.semitons.map((s, i) => {
    const dif = s - MAIOR[e.graus[i]]
    return `${dif < 0 ? '♭'.repeat(-dif) : '♯'.repeat(dif)}${e.graus[i] + 1}`
  })
}

export const nomeTonica = (t: Pitch) => NOMES[grau(t.d)] + SIMBOLO_ACC[t.acc]

/** nome natural em português: "Ré maior", "Lá menor natural", "Dórico de Ré" */
export function titulo(e: Escala, t: Pitch): string {
  const tn = nomeTonica(t)
  if (e.id === 'maior') return `${tn} maior`
  if (e.familia === 'menor') return `${tn} ${e.nome.toLowerCase()}`
  return `${e.nome} de ${tn}`
}

/** sons para tocar a escala (subindo, opcionalmente descendo) */
export function somEscala(ps: Pitch[], descer = false, dur = 0.5) {
  const seq = descer ? [...ps, ...ps.slice(0, -1).reverse()] : ps
  return seq.map((p, i) => ({ t: i * dur, dur: dur * 0.95, notas: [toneNameP(p)] }))
}

