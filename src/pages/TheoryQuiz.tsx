// Quizzes de teoria: figuras, pausas e compassos (com escolha da fórmula de compasso).
import { useRef, useState } from 'react'
import MultipleChoice, { type Pergunta } from '../components/MultipleChoice'
import { SeletorCompasso } from '../components/Controles'
import { n, rand, shuffle, vexKey } from '../music/notes'
import {
  COMPASSOS, beats, compasso, duracaoCompasso, fmtBeats, fmtDuracao, gerarCompasso, nomeFigura, somaFiguras, toSNote,
  type Compasso, type Figura,
} from '../music/rhythm'
import { staffParaSom } from '../music/player'

type Tipo = 'figuras' | 'pausas' | 'compassos'

export const NIVEIS_QUIZ: Record<Tipo, string[]> = {
  figuras: ['Nomes das figuras', 'Quantos tempos vale?', 'Pontuadas e relações', 'Qual figura vale…?'],
  pausas: ['Nomes das pausas', 'Quantos tempos de silêncio?', 'Pausa equivalente à figura', 'Pausas pontuadas'],
  compassos: ['Complete o compasso', 'Completo, falta ou sobra?', 'Qual é a fórmula?', 'Compostos e mistos'],
}

const BASICAS: Figura[] = [{ dur: 'w' }, { dur: 'h' }, { dur: 'q' }, { dur: '8' }, { dur: '16' }]
const PONTUADAS: Figura[] = [{ dur: 'h', dots: 1 }, { dur: 'q', dots: 1 }, { dur: '8', dots: 1 }]
const comoPausa = (f: Figura): Figura => ({ ...f, rest: true })
const VALORES = ['4', '3', '2', '1½', '1', '¾', '½', '¼']

function opcoes(certa: string, todas: string[], qtd = 4): [string[], number] {
  const outras = shuffle([...new Set(todas.filter((x) => x !== certa))]).slice(0, qtd - 1)
  const ops = shuffle([certa, ...outras])
  return [ops, ops.indexOf(certa)]
}

const st = (fs: Figura[], extra = {}) => ({ clef: null, time: null, measures: [fs.map((f) => toSNote(f, 'c/5'))], width: 140 + fs.length * 40, ...extra })

// ───────────────────────── figuras e pausas ─────────────────────────
function perguntaFigura(nivel: number, pausa: boolean): Pergunta {
  const conv = (f: Figura) => (pausa ? comoPausa(f) : f)
  const pool = (nivel >= (pausa ? 4 : 3) ? [...BASICAS, ...PONTUADAS] : BASICAS).map(conv)
  const f = rand(pool)
  const conceito = pausa ? 'pausas' : 'figuras'

  if (nivel === 1 || (nivel >= 3 && Math.random() < 0.25)) {
    const certa = nomeFigura(f)
    const [ops, i] = opcoes(certa, pool.map(nomeFigura))
    return { texto: `Qual é o nome desta ${pausa ? 'pausa' : 'figura'}?`, staff: st([f]), opcoes: ops, certa: i, conceito, explica: `${certa} = ${fmtBeats(beats(f))} tempo(s) em 4/4.` }
  }
  if (nivel === 2 || (nivel === 4 && pausa && Math.random() < 0.5)) {
    const certa = fmtBeats(beats(f))
    const [ops, i] = opcoes(certa, VALORES)
    return { texto: `Quantos tempos ${pausa ? 'de silêncio ' : ''}vale ${pausa ? 'esta pausa' : 'esta figura'} (em 4/4)?`, staff: st([f]), opcoes: ops, certa: i, conceito, explica: `${nomeFigura(f)}: ${certa} tempo(s). Cada figura vale metade da anterior.` }
  }
  if (pausa && nivel === 3) {
    // pausa equivalente à figura mostrada (opções desenhadas)
    const fig = rand(BASICAS)
    const alvo = comoPausa(fig)
    const outras = shuffle(BASICAS.filter((x) => x.dur !== fig.dur)).slice(0, 3).map(comoPausa)
    const ops = shuffle([alvo, ...outras])
    return {
      texto: 'Qual pausa tem a mesma duração desta figura?', staff: st([fig]),
      opcoes: ops.map(nomeFigura), opcoesStaff: ops.map((o) => st([o], { width: 120 })), certa: ops.indexOf(alvo), conceito,
      explica: `${nomeFigura(fig)} e ${nomeFigura(alvo).toLowerCase()} duram ${fmtBeats(beats(fig))} tempo(s).`,
    }
  }
  if (!pausa && nivel === 3) {
    // relações entre figuras
    const [a, b] = shuffle(BASICAS).slice(0, 2).sort((x, y) => beats(y) - beats(x))
    const qtd = beats(a) / beats(b)
    const certa = String(qtd)
    const [ops, i] = opcoes(certa, ['2', '4', '8', '16', '3', '6', '1'])
    return { texto: `Quantas ${nomeFigura(b).toLowerCase()}s cabem em uma ${nomeFigura(a).toLowerCase()}?`, staff: st([a, b], { width: 200 }), opcoes: ops, certa: i, conceito, explica: `${fmtBeats(beats(a))} ÷ ${fmtBeats(beats(b))} = ${qtd}.` }
  }
  // "Qual figura vale X?" — opções desenhadas
  const alvo = rand(pool)
  const outras = shuffle(pool.filter((x) => beats(x) !== beats(alvo))).slice(0, 3)
  const ops = shuffle([alvo, ...outras])
  return {
    texto: `Qual ${pausa ? 'pausa' : 'figura'} vale ${fmtBeats(beats(alvo))} tempo(s)?`,
    opcoes: ops.map(nomeFigura), opcoesStaff: ops.map((o) => st([o], { width: 120 })), certa: ops.indexOf(alvo), conceito,
    explica: `${nomeFigura(alvo)} = ${fmtBeats(beats(alvo))} tempo(s)${alvo.dots ? ': o ponto soma metade do valor' : ''}.`,
  }
}

// ───────────────────────── compassos ─────────────────────────
const ALTURAS = ['c/4', 'd/4', 'e/4', 'f/4', 'g/4', 'a/4', 'b/4', 'c/5'].map(n)
const comAltura = (fs: Figura[]) => fs.map((f) => toSNote(f, vexKey(rand(ALTURAS))))
const FIG_POR_VALOR: Figura[] = [{ dur: 'w' }, { dur: 'h', dots: 1 }, { dur: 'h' }, { dur: 'q', dots: 1 }, { dur: 'q' }, { dur: '8', dots: 1 }, { dur: '8' }, { dur: '16' }]
const figuraDeValor = (v: number) => FIG_POR_VALOR.find((f) => Math.abs(beats(f) - v) < 1e-9)

function audioDe(c: Compasso, measures: ReturnType<typeof comAltura>[]) {
  return { notas: staffParaSom(measures), opcoes: { compasso: c, metronomo: true, bpm: c.tipo === 'composto' ? 50 : 72 } }
}

function perguntaCompasso(nivel: number, fixo: Compasso | null): Pergunta {
  const simples = COMPASSOS.filter((c) => c.tipo === 'simples' && c.id !== '5/4')
  const lista = fixo ? [fixo] : nivel < 4 ? simples : COMPASSOS
  const c = rand(lista)
  const total = duracaoCompasso(c)
  const tipoQ = nivel === 4 ? rand([1, 2, 3]) : nivel

  if (tipoQ === 1) {
    // remove o final do compasso até sobrar um "buraco" que caiba numa única figura
    for (let t = 0; t < 30; t++) {
      const fig = gerarCompasso(2, c).filter((f) => !f.rest || Math.random() < 0.5)
      if (Math.abs(somaFiguras(fig) - total) > 1e-9) continue
      const k = 1 + Math.floor(Math.random() * Math.min(3, fig.length - 1))
      const resto = fig.slice(0, fig.length - k)
      const falta = total - somaFiguras(resto)
      const resposta = figuraDeValor(falta)
      if (!resposta || !resto.length) continue
      const certa = nomeFigura(resposta)
      const [ops, i] = opcoes(certa, FIG_POR_VALOR.map(nomeFigura))
      const notas = comAltura(resto)
      const completo = [...notas, toSNote(resposta, 'c/5', { color: '#16a34a' })]
      return {
        texto: `Em ${c.id}, qual figura completa o compasso?`,
        staff: { clef: 'treble', time: c.id, measures: [notas], width: 380 },
        depois: { clef: 'treble', time: c.id, measures: [completo], width: 380 },
        opcoes: ops, certa: i, conceito: 'completar-compasso',
        audioResposta: audioDe(c, [completo]),
        explica: `${c.id} tem ${fmtDuracao(total, c)}. Já há ${fmtDuracao(total - falta, c)}; faltam ${fmtDuracao(falta, c)} → ${certa.toLowerCase()}.`,
      }
    }
  }
  if (tipoQ === 2) {
    const fig = gerarCompasso(2, c)
    const modo = rand(['ok', 'falta', 'sobra'] as const)
    let fs = [...fig]
    if (modo === 'falta') fs = fs.slice(0, -1)
    if (modo === 'sobra') fs = [...fs, rand([{ dur: 'q' }, { dur: '8' }, { dur: 'h' }] as Figura[])]
    const soma = somaFiguras(fs)
    const opcs = ['Está completo', 'Está faltando', 'Está sobrando']
    const certa = { ok: 0, falta: 1, sobra: 2 }[modo]
    return {
      texto: `Este compasso em ${c.id} está correto?`,
      staff: { clef: 'treble', time: c.id, measures: [comAltura(fs)], width: 400 },
      opcoes: opcs, certa, conceito: 'duracao-compasso',
      explica: `Somando figuras e pausas: ${fmtDuracao(soma, c)}. O compasso ${c.id} precisa de ${fmtDuracao(total, c)}.`,
    }
  }
  // qual é a fórmula? (exclui fórmulas de mesma duração, ex.: 3/4 e 6/8, quando o desenho seria ambíguo)
  const measures = [comAltura(gerarCompasso(2, c)), comAltura(gerarCompasso(2, c))]
  const candidatos = COMPASSOS.filter((x) => x.id !== c.id && duracaoCompasso(x) !== total && (nivel === 4 || x.tipo === 'simples'))
  const ops = shuffle([c, ...shuffle(candidatos).slice(0, 3)])
  return {
    texto: 'Qual é a fórmula de compasso deste trecho?',
    staff: { clef: 'treble', time: null, measures, width: 560 },
    opcoes: ops.map((x) => x.id), certa: ops.indexOf(c), conceito: 'formula-compasso',
    audio: audioDe(c, measures),
    explica: `Cada compasso soma ${fmtDuracao(total, c)} → ${c.id} (${c.nome.toLowerCase()}).`,
  }
}

export default function TheoryQuiz({ tipo }: { tipo: Tipo }) {
  const [fixo, setFixo] = useState<Compasso | null>(null)
  const fixoRef = useRef<Compasso | null>(null)
  fixoRef.current = fixo
  const id = { figuras: 'quiz-figuras', pausas: 'quiz-pausas', compassos: 'quiz-compassos' }[tipo]
  const gerar = (nivel: number) => (tipo === 'compassos' ? perguntaCompasso(nivel, fixoRef.current) : perguntaFigura(nivel, tipo === 'pausas'))

  return (
    <MultipleChoice
      key={fixo?.id ?? 'todos'}
      skill={id}
      niveis={NIVEIS_QUIZ[tipo]}
      gerar={gerar}
      topo={() =>
        tipo === 'compassos' && (
          <div className="toolbar">
            <label className="check"><input type="checkbox" checked={!!fixo} onChange={(e) => setFixo(e.target.checked ? compasso('6/8') : null)} /> Estudar uma fórmula específica</label>
            {fixo && <SeletorCompasso valor={fixo} onChange={setFixo} />}
          </div>
        )
      }
    />
  )
}
