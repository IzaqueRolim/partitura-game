// Progresso do aluno (localStorage): histórico por habilidade, repetição espaçada,
// cartões de revisão de erros, metas diárias, sequência de dias e conquistas.
// No app com Capacitor isso continua funcionando (WebView).

export function load<T>(key: string, def: T): T {
  try {
    const raw = localStorage.getItem('partitura:' + key)
    return raw ? (JSON.parse(raw) as T) : def
  } catch {
    return def
  }
}

export function save<T>(key: string, val: T) {
  try {
    localStorage.setItem('partitura:' + key, JSON.stringify(val))
  } catch {
    /* armazenamento indisponível */
  }
}

/** avisos para a interface (conquistas, níveis): o App mostra como toast */
export function avisar(titulo: string, texto = '') {
  window.dispatchEvent(new CustomEvent('partitura:aviso', { detail: { titulo, texto } }))
}

const DIA = 86400000
export const hoje = (d = new Date()) => d.toLocaleDateString('sv') // AAAA-MM-DD
const inicioDoDia = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

// ───────────────────────── Habilidades ─────────────────────────
export interface Resumo {
  feito?: boolean
  acertos?: number
  tentativas?: number
  melhor?: number // melhor % de precisão
  ultimas?: number[] // últimas respostas (1 = acerto, 0 = erro)
  primeira?: number
  ultima?: number
  intervalo?: number // dias até a próxima revisão
  intervaloAnterior?: number
  dia?: string
  proxima?: number // timestamp da próxima revisão
}

export const resumos = () => load<Record<string, Resumo>>('resumo', {})

export const precisao = (r?: Resumo, n = 10) => {
  const u = r?.ultimas?.slice(-n) ?? []
  return u.length ? u.reduce((a, b) => a + b, 0) / u.length : r?.tentativas ? (r.acertos ?? 0) / r.tentativas : 0
}

interface Dia { respostas: number; acertos: number; xp: number }
export const dias = () => load<Record<string, Dia>>('dias', {})
export const metaDiaria = () => load<number>('meta', 20)
export const definirMeta = (n: number) => save('meta', n)
export const xpTotal = () => Object.values(dias()).reduce((s, d) => s + d.xp, 0)

/** registra resultado de uma atividade (respostas, melhor %, ou lição concluída) */
export function registrar(chave: string, parcial: Resumo) {
  const all = resumos()
  const atual = all[chave] ?? {}
  const t = parcial.tentativas ?? 0
  const a = parcial.acertos ?? 0
  const agora = Date.now()
  const novo: Resumo = {
    ...atual,
    feito: atual.feito || parcial.feito,
    acertos: (atual.acertos ?? 0) + a,
    tentativas: (atual.tentativas ?? 0) + t,
    melhor: Math.max(atual.melhor ?? 0, parcial.melhor ?? 0),
    ultimas: [...(atual.ultimas ?? []), ...Array.from({ length: t }, (_, i) => (i < a ? 1 : 0))].slice(-30),
    primeira: atual.primeira ?? agora,
    ultima: agora,
  }
  // repetição espaçada por habilidade: o intervalo cresce quando a precisão é alta
  if (t > 0 || parcial.feito || parcial.melhor) {
    if (novo.dia !== hoje()) {
      novo.intervaloAnterior = novo.intervalo ?? 0
      novo.dia = hoje()
    }
    const acc = parcial.melhor && !t ? parcial.melhor / 100 : precisao(novo)
    const base = novo.intervaloAnterior ?? 0
    novo.intervalo = acc >= 0.9 ? Math.min(30, Math.max(1, base * 2 || 2)) : acc >= 0.7 ? Math.max(1, base) : 1
    novo.proxima = inicioDoDia() + novo.intervalo * DIA
  }
  all[chave] = novo
  save('resumo', all)

  if (t > 0) {
    const ds = dias()
    const d = ds[hoje()] ?? { respostas: 0, acertos: 0, xp: 0 }
    const antes = d.respostas
    d.respostas += t
    d.acertos += a
    d.xp += a * 10 + (t - a) * 2
    ds[hoje()] = d
    save('dias', ds)
    const meta = metaDiaria()
    if (antes < meta && d.respostas >= meta) avisar('Meta diária cumprida!', `${meta} respostas hoje.`)
  }
  verificarConquistas()
}

/** responde uma pergunta; em caso de erro, a pergunta entra no baralho de revisão */
export function responder(skill: string, certo: boolean, pergunta?: unknown) {
  registrar(skill, { acertos: certo ? 1 : 0, tentativas: 1 })
  if (!certo && pergunta) adicionarCartao(skill, pergunta)
}

// ───────────────────────── Revisão de erros (cartões) ─────────────────────────
export interface Cartao { id: string; skill: string; pergunta: unknown; caixa: number; proxima: number; erros: number }
const INTERVALOS_CAIXA = [0, 0, 1, 3, 7, 16, 35] // dias por caixa (Leitner)

export const cartoes = () => load<Cartao[]>('cartoes', [])

function adicionarCartao(skill: string, pergunta: unknown) {
  const id = skill + ':' + JSON.stringify(pergunta).slice(0, 400)
  const cs = cartoes()
  const ex = cs.find((c) => c.id === id)
  if (ex) {
    ex.caixa = 1
    ex.erros++
    ex.proxima = Date.now()
  } else cs.push({ id, skill, pergunta, caixa: 1, proxima: Date.now(), erros: 1 })
  save('cartoes', cs.slice(-200))
}

export const cartoesPendentes = () => cartoes().filter((c) => c.proxima <= Date.now()).sort((a, b) => a.caixa - b.caixa || b.erros - a.erros)

export function revisarCartao(id: string, certo: boolean) {
  const cs = cartoes()
  const c = cs.find((x) => x.id === id)
  if (!c) return
  if (certo) {
    c.caixa = Math.min(6, c.caixa + 1)
    c.proxima = inicioDoDia() + INTERVALOS_CAIXA[c.caixa] * DIA
  } else {
    c.caixa = 1
    c.erros++
    c.proxima = Date.now() + 10 * 60000
  }
  // cartões dominados (caixa 6) saem do baralho
  save('cartoes', cs.filter((x) => x.caixa < 6))
  save('revisados', load('revisados', 0) + 1)
  registrar('revisao', { acertos: certo ? 1 : 0, tentativas: 1 })
}

/** habilidades com revisão vencida ou que precisam de reforço */
export function habilidadesParaRevisar(): { id: string; motivo: 'vencida' | 'reforco'; acc: number }[] {
  const r = resumos()
  const agora = Date.now()
  return Object.entries(r)
    .filter(([id, x]) => id !== 'revisao' && (x.tentativas ?? 0) >= 5)
    .map(([id, x]) => ({ id, acc: precisao(x), vencida: (x.proxima ?? 0) <= agora }))
    .filter((x) => x.vencida || x.acc < 0.7)
    .map((x) => ({ id: x.id, acc: x.acc, motivo: (x.acc < 0.7 ? 'reforco' : 'vencida') as 'vencida' | 'reforco' }))
    .sort((a, b) => a.acc - b.acc)
}

// ───────────────────────── Sequência de dias ─────────────────────────
export function sequenciaDias(): number {
  const ds = dias()
  let n = 0
  const d = new Date()
  if (!ds[hoje(d)]?.respostas) d.setDate(d.getDate() - 1) // ainda dá tempo de praticar hoje
  while (ds[hoje(d)]?.respostas) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

// ───────────────────────── Níveis ─────────────────────────
export interface EstadoNivel { atual: number; max: number; hist: Record<number, number[]> }
export const estadoNivel = (skill: string) => load<EstadoNivel>('nivel:' + skill, { atual: 1, max: 1, hist: {} })

// ───────────────────────── Conquistas ─────────────────────────
interface Conquista { id: string; nome: string; desc: string; ok: () => boolean }
const r = (id: string) => resumos()[id] ?? {}
const totalRespostas = () => Object.values(dias()).reduce((s, d) => s + d.respostas, 0)
const totalAcertos = () => Object.values(dias()).reduce((s, d) => s + d.acertos, 0)

export const CONQUISTAS: Conquista[] = [
  { id: 'primeiros-passos', nome: 'Primeiros passos', desc: 'Responda 10 perguntas', ok: () => totalRespostas() >= 10 },
  { id: 'cem-acertos', nome: 'Cem acertos', desc: 'Acumule 100 acertos', ok: () => totalAcertos() >= 100 },
  { id: 'quinhentos', nome: 'Estudante dedicado', desc: 'Acumule 500 acertos', ok: () => totalAcertos() >= 500 },
  { id: 'meta', nome: 'Meta cumprida', desc: 'Cumpra a meta diária', ok: () => Object.values(dias()).some((d) => d.respostas >= metaDiaria()) },
  { id: 'seq-3', nome: '3 dias seguidos', desc: 'Pratique 3 dias seguidos', ok: () => sequenciaDias() >= 3 },
  { id: 'seq-7', nome: 'Uma semana', desc: 'Pratique 7 dias seguidos', ok: () => sequenciaDias() >= 7 },
  { id: 'seq-30', nome: 'Um mês de música', desc: 'Pratique 30 dias seguidos', ok: () => sequenciaDias() >= 30 },
  { id: 'teoria', nome: 'Teórico', desc: 'Conclua 5 lições', ok: () => Object.entries(resumos()).filter(([k, v]) => k.startsWith('licao-') && v.feito).length >= 5 },
  { id: 'clave-sol', nome: 'Leitor da clave de Sol', desc: '50 acertos com 90% nas últimas 20 notas', ok: () => (r('notas-sol').acertos ?? 0) >= 50 && precisao(r('notas-sol'), 20) >= 0.9 },
  { id: 'clave-fa', nome: 'Leitor da clave de Fá', desc: '50 acertos com 90% nas últimas 20 notas', ok: () => (r('notas-fa').acertos ?? 0) >= 50 && precisao(r('notas-fa'), 20) >= 0.9 },
  { id: 'ritmo', nome: 'Ritmo certeiro', desc: 'Faça 90% num exercício de ritmo', ok: () => (r('ritmo').melhor ?? 0) >= 90 },
  { id: 'ouvido', nome: 'Ouvido afinado', desc: 'Chegue ao nível 3 da percepção de notas', ok: () => estadoNivel('percepcao').max >= 3 },
  { id: 'armaduras', nome: 'Mestre das armaduras', desc: 'Desbloqueie o último nível de armaduras', ok: () => estadoNivel('armaduras').max >= 5 },
  { id: 'intervalos', nome: 'Saltador', desc: 'Chegue ao nível 4 de intervalos', ok: () => estadoNivel('intervalos').max >= 4 },
  { id: 'maestro', nome: 'Maestro', desc: '20 acertos no Maestro do compasso', ok: () => (r('maestro').acertos ?? 0) >= 20 },
  { id: 'construtor', nome: 'Arquiteto do compasso', desc: '10 compassos corretos no construtor', ok: () => (r('construtor').acertos ?? 0) >= 10 },
  { id: 'revisor', nome: 'Aprendendo com os erros', desc: 'Revise 20 cartões de erro', ok: () => load('revisados', 0) >= 20 },
  { id: 'desafio', nome: 'Leitor completo', desc: 'Acerte 80% de um desafio de partitura', ok: () => (r('desafio-partitura').melhor ?? 0) >= 80 },
]

export const conquistasObtidas = () => load<Record<string, number>>('conquistas', {})

export function verificarConquistas() {
  const obtidas = conquistasObtidas()
  let mudou = false
  for (const c of CONQUISTAS) {
    if (obtidas[c.id]) continue
    try {
      if (c.ok()) {
        obtidas[c.id] = Date.now()
        mudou = true
        avisar('Conquista desbloqueada: ' + c.nome, c.desc)
      }
    } catch {
      /* ignora */
    }
  }
  if (mudou) save('conquistas', obtidas)
}
