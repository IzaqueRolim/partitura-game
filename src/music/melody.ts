// Gerador de melodias: ritmo (por fórmula de compasso) + alturas (com armadura e acidentes ocasionais).
// Usado na leitura de melodias, no piano, no ritmo com melodia e no desafio integrado.
import type { SNote } from '../components/Staff'
import { type Acc, type Armadura, type Pitch, grau, n, naArmadura, P, toneNameP, VEX_ACC, vexKeyP } from './notes'
import { beats, eventos, gerarCompasso, toSNote, type Compasso, type Evento, type Figura } from './rhythm'

export interface EventoMelodia extends Evento {
  pitch?: Pitch
  /** símbolo de acidente a desenhar (acidente ocorrente) */
  simbolo?: string
}

export interface Melodia {
  compasso: Compasso
  armadura?: Armadura
  figuras: Figura[][]
  eventos: EventoMelodia[]
}

export interface OpcoesMelodia {
  compasso: Compasso
  nCompassos: number
  nivelRitmo: number // 1–3
  faixa: [number, number] // índices diatônicos
  armadura?: Armadura
  acidentes?: boolean // acidentes ocorrentes (♯/♭ fora da armadura)
  /** só notas de mesmo valor (ex.: leitura simples) */
  figuraFixa?: Figura
  /** maior salto permitido (em graus) */
  saltoMax?: number
}

export function gerarMelodia(o: OpcoesMelodia): Melodia {
  const figuras: Figura[][] = Array.from({ length: o.nCompassos }, () => {
    if (!o.figuraFixa) return gerarCompasso(o.nivelRitmo, o.compasso)
    const qtd = Math.round(((o.compasso.num * 4) / o.compasso.den) / beats(o.figuraFixa))
    return Array.from({ length: qtd }, () => ({ ...o.figuraFixa! }))
  })
  const ev = eventos(figuras) as EventoMelodia[]
  const [lo, hi] = o.faixa
  const salto = o.saltoMax ?? 2
  // tônica (para terminar a melodia "em casa")
  const tonicaGrau = o.armadura ? grau(o.armadura.tonica.d) : 0
  let d = lo + Math.floor(Math.random() * (hi - lo + 1))
  const sons = ev.filter((e) => !e.figura.rest)
  sons.forEach((e, i) => {
    if (i === sons.length - 1) {
      // última nota: tônica mais próxima dentro da faixa
      const cands: number[] = []
      for (let x = lo; x <= hi; x++) if (grau(x) === tonicaGrau) cands.push(x)
      if (cands.length) d = cands.reduce((a, b) => (Math.abs(b - d) < Math.abs(a - d) ? b : a))
    }
    e.pitch = naArmadura(o.armadura, d)
    let passo = Math.floor(Math.random() * (2 * salto + 1)) - salto
    if (passo === 0 && Math.random() < 0.6) passo = Math.random() < 0.5 ? 1 : -1
    d = Math.max(lo, Math.min(hi, d + passo))
  })

  // acidentes ocorrentes: no máximo um por compasso; vale até o fim do compasso
  if (o.acidentes) {
    for (let m = 0; m < o.nCompassos; m++) {
      if (Math.random() < 0.5) continue
      const doCompasso = ev.filter((e) => e.medida === m && e.pitch)
      if (doCompasso.length < 2) continue
      const alvo = doCompasso[1 + Math.floor(Math.random() * (doCompasso.length - 1))]
      const base = alvo.pitch!
      const novo: Acc = base.acc === 0 ? (Math.random() < 0.5 ? 1 : -1) : 0
      // evita Mi♯/Si♯/Fá♭/Dó♭, que confundem no começo
      const g = grau(base.d)
      if ((novo === 1 && (g === 2 || g === 6)) || (novo === -1 && (g === 3 || g === 0))) continue
      doCompasso.forEach((e) => {
        if (e.idx >= alvo.idx && e.pitch!.d === base.d) {
          e.pitch = P(base.d, novo)
          if (e === alvo) e.simbolo = VEX_ACC[novo]
        }
      })
    }
  }
  return { compasso: o.compasso, armadura: o.armadura, figuras, eventos: ev }
}

/** Converte a melodia em compassos desenháveis (cores opcionais por índice de evento) */
export function melodiaParaStaff(m: Melodia, cor?: (i: number) => string | undefined, rotulo?: (i: number) => string | undefined): SNote[][] {
  return m.figuras.map((_, mi) =>
    m.eventos
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.medida === mi)
      .map(({ e, i }) =>
        toSNote(e.figura, e.pitch ? vexKeyP(e.pitch) : 'b/4', { acc: e.simbolo, color: cor?.(i), label: rotulo?.(i) }),
      ),
  )
}

/** Notas para o player (tempo em semínimas) */
export const melodiaParaSom = (m: Melodia) =>
  m.eventos.filter((e) => e.pitch).map((e) => ({ t: e.inicio, dur: beats(e.figura), notas: [toneNameP(e.pitch!)] }))

/** faixas usuais por clave */
export const FAIXA_MELODIA = {
  treble: [[n('c/4'), n('g/4')], [n('c/4'), n('c/5')], [n('a/3'), n('e/5')], [n('g/3'), n('g/5')]] as [number, number][],
  bass: [[n('c/3'), n('g/3')], [n('g/2'), n('c/4')], [n('e/2'), n('e/4')], [n('c/2'), n('e/4')]] as [number, number][],
}
