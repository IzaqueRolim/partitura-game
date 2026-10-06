// Escritor de partituras: modelo de dados, edição (com validação de compasso),
// grafia de acidentes, reprodução, exportação MusicXML e armazenamento local.
import { load, save } from '../store'
import {
  type Acc, type Armadura, type Clef, type Pitch, accDaArmadura, armadura as armaduraPorVex, fromMidi, grau, midiP, n, NOMES,
  P, SIMBOLO_ACC, toneNameP, VEX_ACC, LETRAS, oitava,
} from './notes'
import { BEATS, compasso as compassoPorId, duracaoCompasso, fmtDuracao, type Compasso, type Dur } from './rhythm'
import type { NotaTocada } from './player'

export interface NotaE {
  id: string
  dur: Dur
  dots: number
  rest: boolean
  alturas: Pitch[] // vazio quando é pausa; mais de uma = acorde
  liga?: boolean // ligadura de valor com a próxima nota
}
export interface PautaE { clef: Clef; nome: string; compassos: NotaE[][] }
export interface PartituraE {
  id: string
  titulo: string
  autor?: string
  compasso: string
  armadura: string
  bpm: number
  pautas: PautaE[]
  editadaEm: number
}
export type FormatoPautas = 'sol' | 'fa' | 'piano'

/** seleção / cursor: idx = nota selecionada; -1 = início do compasso (antes da 1ª nota) */
export interface Sel { pauta: number; compasso: number; idx: number }

let seq = 0
export const novoId = () => `n${Date.now().toString(36)}${(seq++).toString(36)}`

export function novaPartitura(o: { titulo: string; compasso: string; armadura: string; bpm: number; formato: FormatoPautas; compassos?: number }): PartituraE {
  const vazio = () => Array.from({ length: o.compassos ?? 4 }, () => [] as NotaE[])
  const pautas: PautaE[] =
    o.formato === 'piano'
      ? [{ clef: 'treble', nome: 'Mão direita', compassos: vazio() }, { clef: 'bass', nome: 'Mão esquerda', compassos: vazio() }]
      : [{ clef: o.formato === 'sol' ? 'treble' : 'bass', nome: o.formato === 'sol' ? 'Clave de Sol' : 'Clave de Fá', compassos: vazio() }]
  return { id: novoId(), titulo: o.titulo || 'Sem título', compasso: o.compasso, armadura: o.armadura, bpm: o.bpm, pautas, editadaEm: Date.now() }
}

export const durNota = (x: Pick<NotaE, 'dur' | 'dots'>) => BEATS[x.dur] * (x.dots ? 1.5 : 1)
export const soma = (c: NotaE[]) => c.reduce((s, x) => s + durNota(x), 0)
export const formula = (p: PartituraE): Compasso => compassoPorId(p.compasso)
export const capacidade = (p: PartituraE) => duracaoCompasso(formula(p))
export const totalCompassos = (p: PartituraE) => Math.max(...p.pautas.map((x) => x.compassos.length))
const EPS = 1e-9

/** todas as pautas com o mesmo número de compassos (e pelo menos 1) */
function normalizar(p: PartituraE): PartituraE {
  const total = Math.max(1, totalCompassos(p))
  return { ...p, editadaEm: Date.now(), pautas: p.pautas.map((pt) => ({ ...pt, compassos: [...pt.compassos, ...Array.from({ length: total - pt.compassos.length }, () => [])] })) }
}

function comCompasso(p: PartituraE, pauta: number, ci: number, novo: NotaE[]): PartituraE {
  return normalizar({ ...p, pautas: p.pautas.map((pt, i) => (i !== pauta ? pt : { ...pt, compassos: pt.compassos.map((c, j) => (j === ci ? novo : c)) })) })
}

export interface Resultado { p: PartituraE; sel: Sel; erro?: string }

/** insere depois da seleção; se o compasso estiver cheio e o cursor no fim, passa ao próximo compasso */
export function inserir(p: PartituraE, sel: Sel, nota: NotaE): Resultado {
  const cap = capacidade(p)
  const c = p.pautas[sel.pauta].compassos[sel.compasso] ?? []
  const restante = cap - soma(c)
  const d = durNota(nota)
  if (d <= restante + EPS) {
    const novo = [...c]
    novo.splice(sel.idx + 1, 0, nota)
    return { p: comCompasso(p, sel.pauta, sel.compasso, novo), sel: { ...sel, idx: sel.idx + 1 } }
  }
  const noFim = sel.idx >= c.length - 1
  if (restante <= EPS && noFim) {
    const prox = sel.compasso + 1
    let q = p
    if (prox >= totalCompassos(p)) q = adicionarCompasso(p)
    return inserir(q, { pauta: sel.pauta, compasso: prox, idx: -1 }, nota)
  }
  const c2 = formula(p)
  return {
    p, sel,
    erro: restante <= EPS
      ? `Este compasso já está completo (${fmtDuracao(cap, c2)}). Vá para o fim dele ou para o próximo compasso.`
      : `Não cabe: a figura dura ${fmtDuracao(d, c2)}, mas restam ${fmtDuracao(restante, c2)} neste compasso. Escolha uma figura menor ou use ligadura.`,
  }
}

export function adicionarCompasso(p: PartituraE, depoisDe?: number): PartituraE {
  const pos = depoisDe === undefined ? totalCompassos(p) : depoisDe + 1
  return normalizar({ ...p, pautas: p.pautas.map((pt) => { const cs = [...pt.compassos]; cs.splice(pos, 0, []); return { ...pt, compassos: cs } }) })
}

export function removerCompasso(p: PartituraE, ci: number): PartituraE {
  if (totalCompassos(p) <= 1) return normalizar({ ...p, pautas: p.pautas.map((pt) => ({ ...pt, compassos: [[]] })) })
  return normalizar({ ...p, pautas: p.pautas.map((pt) => ({ ...pt, compassos: pt.compassos.filter((_, i) => i !== ci) })) })
}

export function notaEm(p: PartituraE, s: Sel): NotaE | undefined {
  return p.pautas[s.pauta]?.compassos[s.compasso]?.[s.idx]
}

/** altera a nota selecionada (valida a duração dentro do compasso) */
export function alterar(p: PartituraE, sel: Sel, f: (x: NotaE) => NotaE): Resultado {
  const c = p.pautas[sel.pauta].compassos[sel.compasso]
  const atual = c?.[sel.idx]
  if (!atual) return { p, sel }
  const novo = f(atual)
  const novoC = c.map((x, i) => (i === sel.idx ? novo : x))
  const cap = capacidade(p)
  if (soma(novoC) > cap + EPS) {
    const c2 = formula(p)
    return { p, sel, erro: `Não cabe: o compasso ficaria com ${fmtDuracao(soma(novoC), c2)}, mas ${p.compasso} comporta ${fmtDuracao(cap, c2)}.` }
  }
  return { p: comCompasso(p, sel.pauta, sel.compasso, novoC), sel }
}

export function remover(p: PartituraE, sel: Sel): Resultado {
  const c = p.pautas[sel.pauta].compassos[sel.compasso]
  if (!c?.[sel.idx]) {
    // sem nota: Backspace no início de um compasso vazio volta ao compasso anterior
    if (sel.idx === -1 && sel.compasso > 0) return { p, sel: fimDoCompasso(p, sel.pauta, sel.compasso - 1) }
    return { p, sel }
  }
  const novo = c.filter((_, i) => i !== sel.idx)
  return { p: comCompasso(p, sel.pauta, sel.compasso, novo), sel: { ...sel, idx: sel.idx - 1 } }
}

export const fimDoCompasso = (p: PartituraE, pauta: number, ci: number): Sel => ({ pauta, compasso: ci, idx: (p.pautas[pauta].compassos[ci]?.length ?? 0) - 1 })

/** move o cursor para a nota anterior/seguinte, atravessando compassos */
export function mover(p: PartituraE, sel: Sel, dir: 1 | -1): Sel {
  const c = p.pautas[sel.pauta].compassos[sel.compasso] ?? []
  if (dir === 1) {
    if (sel.idx < c.length - 1) return { ...sel, idx: sel.idx + 1 }
    if (sel.compasso + 1 < totalCompassos(p)) return { ...sel, compasso: sel.compasso + 1, idx: -1 }
    return sel
  }
  if (sel.idx > -1) return { ...sel, idx: sel.idx - 1 }
  if (sel.compasso > 0) return fimDoCompasso(p, sel.pauta, sel.compasso - 1)
  return sel
}

// ───────────────────────── alturas ─────────────────────────
export const BASE_ENTRADA: Record<Clef, number> = { treble: n('c/5'), bass: n('c/3') }

/** altura natural com o acidente da armadura */
export const comArmadura = (arm: Armadura, d: number): Pitch => P(d, accDaArmadura(arm, grau(d)))

/** nota com a letra pedida, na oitava mais próxima da referência */
export function letraProxima(g: number, ref: number): number {
  let melhor = ref
  let dist = Infinity
  for (let d = ref - 6; d <= ref + 6; d++) if (grau(d) === g && Math.abs(d - ref) < dist) { dist = Math.abs(d - ref); melhor = d }
  return melhor
}

/** última altura escrita antes da seleção (para escolher a oitava da próxima nota) */
export function alturaReferencia(p: PartituraE, sel: Sel): number {
  const pt = p.pautas[sel.pauta]
  for (let ci = sel.compasso; ci >= 0; ci--) {
    const c = pt.compassos[ci]
    const ini = ci === sel.compasso ? sel.idx : c.length - 1
    for (let i = ini; i >= 0; i--) if (c[i] && !c[i].rest) return c[i].alturas[c[i].alturas.length - 1].d
  }
  return BASE_ENTRADA[pt.clef]
}

/** grafia de uma tecla (MIDI): teclas pretas com ♯ ou ♭ conforme a armadura */
export function grafarMidi(m: number, arm: Armadura): Pitch {
  const nat = fromMidi(m)
  if (nat !== null) return P(nat) // tecla branca: nota natural (com bequadro se a armadura alterar)
  const sust = P(fromMidi(m - 1)!, 1)
  const bem = P(fromMidi(m + 1)!, -1)
  if (accDaArmadura(arm, grau(bem.d)) === -1) return bem
  if (accDaArmadura(arm, grau(sust.d)) === 1) return sust
  return arm.tipo === -1 ? bem : sust
}

/** muda a altura um grau (com a armadura) ou uma oitava */
export function transpor(x: Pitch, passos: number, arm: Armadura, oitavaInteira = false): Pitch {
  if (oitavaInteira) return P(x.d + 7 * Math.sign(passos), x.acc)
  return comArmadura(arm, x.d + passos)
}

export const nomeAltura = (x: Pitch) => `${NOMES[grau(x.d)]}${SIMBOLO_ACC[x.acc]}${oitava(x.d)}`

/**
 * Símbolos de acidente a desenhar em um compasso, seguindo as regras de escrita:
 * a armadura vale para todas as oitavas; um acidente escrito vale até o fim do compasso
 * para aquela nota; o bequadro cancela.
 */
export function acidentesDoCompasso(c: NotaE[], arm: Armadura): (string | undefined)[][] {
  const vigente = new Map<number, Acc>()
  return c.map((x) =>
    x.alturas.map((a) => {
      const atual = vigente.has(a.d) ? vigente.get(a.d)! : accDaArmadura(arm, grau(a.d))
      if (a.acc === atual) return undefined
      vigente.set(a.d, a.acc)
      return VEX_ACC[a.acc]
    }),
  )
}

// ───────────────────────── reprodução ─────────────────────────
export interface EventoSom extends NotaTocada { ids: string[]; pauta: number; midi: number[] }

/** converte a partitura em notas tocáveis (ligaduras somadas), em semínimas desde o início */
export function paraSom(p: PartituraE): { notas: EventoSom[]; inicioNota: Map<string, { t: number; dur: number }>; duracao: number } {
  const cap = capacidade(p)
  const notas: EventoSom[] = []
  const inicioNota = new Map<string, { t: number; dur: number }>()
  p.pautas.forEach((pt, pi) => {
    const seqN: { x: NotaE; t: number }[] = []
    pt.compassos.forEach((c, ci) => {
      let t = ci * cap
      for (const x of c) { seqN.push({ x, t }); t += durNota(x) }
    })
    let pendente: EventoSom | null = null
    seqN.forEach(({ x, t }) => {
      inicioNota.set(x.id, { t, dur: durNota(x) })
      if (x.rest) { pendente = null; return }
      const midis = x.alturas.map(midiP)
      const ant = pendente as EventoSom | null
      if (ant && ant.t + ant.dur >= t - EPS && ant.midi.join() === midis.join()) {
        ant.dur += durNota(x)
        ant.ids.push(x.id)
      } else {
        const ev: EventoSom = { t, dur: durNota(x), notas: x.alturas.map(toneNameP), midi: midis, ids: [x.id], pauta: pi, vel: 0.72 }
        notas.push(ev)
        pendente = ev
      }
      if (!x.liga) pendente = null
    })
  })
  notas.sort((a, b) => a.t - b.t)
  return { notas, inicioNota, duracao: totalCompassos(p) * cap }
}

// ───────────────────────── MusicXML ─────────────────────────
const TIPO_XML: Record<Dur, string> = { w: 'whole', h: 'half', q: 'quarter', '8': 'eighth', '16': '16th' }
const esc = (s: string) => s.replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[ch]!)

export function exportarMusicXML(p: PartituraE): string {
  const DIV = 8 // divisões por semínima
  const arm = armaduraPorVex(p.armadura)
  const c = formula(p)
  const fifths = arm.tipo * arm.qtd
  const nPautas = p.pautas.length
  const total = totalCompassos(p)
  let partes = ''
  for (let ci = 0; ci < total; ci++) {
    let m = `<measure number="${ci + 1}">`
    if (ci === 0) {
      m += `<attributes><divisions>${DIV}</divisions><key><fifths>${fifths}</fifths></key><time><beats>${c.num}</beats><beat-type>${c.den}</beat-type></time>`
      if (nPautas > 1) m += `<staves>${nPautas}</staves>`
      p.pautas.forEach((pt, i) => { m += `<clef number="${i + 1}"><sign>${pt.clef === 'treble' ? 'G' : 'F'}</sign><line>${pt.clef === 'treble' ? 2 : 4}</line></clef>` })
      m += `</attributes><direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${p.bpm}</per-minute></metronome></direction-type><sound tempo="${p.bpm}"/></direction>`
    }
    p.pautas.forEach((pt, pi) => {
      const notas = pt.compassos[ci] ?? []
      const usado = soma(notas)
      // a pauta anterior sempre termina no fim do compasso (notas + forward)
      if (pi > 0) m += `<backup><duration>${Math.round(capacidade(p) * DIV)}</duration></backup>`
      const anterior = (i: number) => (i > 0 ? notas[i - 1] : pt.compassos[ci - 1]?.[pt.compassos[ci - 1].length - 1])
      notas.forEach((x, i) => {
        const dur = Math.round(durNota(x) * DIV)
        const fimLiga = anterior(i)?.liga
        const alturas = x.rest ? [null] : x.alturas
        alturas.forEach((a, k) => {
          m += '<note>' + (k > 0 ? '<chord/>' : '')
          if (!a) m += '<rest/>'
          else m += `<pitch><step>${LETRAS[grau(a.d)].toUpperCase()}</step>${a.acc ? `<alter>${a.acc}</alter>` : ''}<octave>${oitava(a.d)}</octave></pitch>`
          m += `<duration>${dur}</duration>`
          if (a && fimLiga) m += '<tie type="stop"/>'
          if (a && x.liga) m += '<tie type="start"/>'
          m += `<voice>${pi + 1}</voice><type>${TIPO_XML[x.dur]}</type>${x.dots ? '<dot/>' : ''}`
          if (nPautas > 1) m += `<staff>${pi + 1}</staff>`
          if (a && (fimLiga || x.liga)) m += `<notations>${fimLiga ? '<tied type="stop"/>' : ''}${x.liga ? '<tied type="start"/>' : ''}</notations>`
          m += '</note>'
        })
      })
      // completa compassos incompletos com pausa invisível (forward)
      const falta = capacidade(p) - usado
      if (falta > EPS) m += `<forward><duration>${Math.round(falta * DIV)}</duration><voice>${pi + 1}</voice>${nPautas > 1 ? `<staff>${pi + 1}</staff>` : ''}</forward>`
    })
    if (ci === total - 1) m += '<barline location="right"><bar-style>light-heavy</bar-style></barline>'
    partes += m + '</measure>'
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1"><work><work-title>${esc(p.titulo)}</work-title></work>${p.autor ? `<identification><creator type="composer">${esc(p.autor)}</creator></identification>` : ''}
<part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">${partes}</part></score-partwise>`
}

// ───────────────────────── armazenamento ─────────────────────────
export const listarPartituras = () => load<PartituraE[]>('escritor:partituras', []).sort((a, b) => b.editadaEm - a.editadaEm)
export function salvarPartitura(p: PartituraE) {
  const l = load<PartituraE[]>('escritor:partituras', []).filter((x) => x.id !== p.id)
  save('escritor:partituras', [...l, p])
}
export function apagarPartitura(id: string) {
  save('escritor:partituras', load<PartituraE[]>('escritor:partituras', []).filter((x) => x.id !== id))
}

// ───────────────────────── exemplo ─────────────────────────
/** Ode à Alegria (Beethoven), para piano: mostra acordes, ligadura de valor e duas mãos */
export function exemploOde(): PartituraE {
  const q = (k: string, extra: Partial<NotaE> = {}): NotaE => ({ id: novoId(), dur: 'q', dots: 0, rest: false, alturas: [P(n(k))], ...extra })
  const ac = (ks: string[], dur: Dur): NotaE => ({ id: novoId(), dur, dots: 0, rest: false, alturas: ks.map((k) => P(n(k))) })
  const md = [
    [q('e/4'), q('e/4'), q('f/4'), q('g/4')], [q('g/4'), q('f/4'), q('e/4'), q('d/4')], [q('c/4'), q('c/4'), q('d/4'), q('e/4')],
    [q('e/4', { dots: 1 }), q('d/4', { dur: '8' }), q('d/4', { dur: 'h' })],
    [q('e/4'), q('e/4'), q('f/4'), q('g/4')], [q('g/4'), q('f/4'), q('e/4'), q('d/4')], [q('c/4'), q('c/4'), q('d/4'), q('e/4')],
    [q('d/4', { dots: 1 }), q('c/4', { dur: '8' }), q('c/4', { dur: 'h', liga: true })], [q('c/4', { dur: 'w' })],
  ]
  const me = [
    [ac(['c/3', 'g/3'], 'h'), ac(['c/3', 'g/3'], 'h')], [ac(['b/2', 'g/3'], 'h'), ac(['b/2', 'g/3'], 'h')], [ac(['c/3', 'g/3'], 'h'), ac(['c/3', 'e/3'], 'h')],
    [ac(['c/3', 'g/3'], 'h'), ac(['g/2', 'g/3'], 'h')], [ac(['c/3', 'g/3'], 'h'), ac(['c/3', 'g/3'], 'h')], [ac(['b/2', 'g/3'], 'h'), ac(['b/2', 'g/3'], 'h')],
    [ac(['c/3', 'g/3'], 'h'), ac(['c/3', 'e/3'], 'h')], [ac(['g/2', 'f/3'], 'h'), ac(['c/3', 'e/3'], 'h')], [ac(['c/3', 'e/3', 'g/3'], 'w')],
  ]
  return {
    id: novoId(), titulo: 'Ode à Alegria', autor: 'Ludwig van Beethoven', compasso: '4/4', armadura: 'C', bpm: 100, editadaEm: Date.now(),
    pautas: [{ clef: 'treble', nome: 'Mão direita', compassos: md }, { clef: 'bass', nome: 'Mão esquerda', compassos: me }],
  }
}
