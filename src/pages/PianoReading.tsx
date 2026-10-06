// Minigame "Partitura para teclado": leia a nota no pentagrama e toque a tecla certa.
// Evolui de notas isoladas para sequências e pequenas melodias (com ritmo e armadura).
import { useEffect, useRef, useState } from 'react'
import Staff, { type SNote } from '../components/Staff'
import Piano, { type Marca } from '../components/Piano'
import Niveis from '../components/Niveis'
import { useNivel } from '../hooks/useNivel'
import { tocarSequencia } from '../music/player'
import { armadura, midiP, n, nomeP, nomesMidi, P, rand, toneNameP, vexKey, type Clef, type Pitch } from '../music/notes'
import { gerarMelodia, melodiaParaSom, melodiaParaStaff, type Melodia } from '../music/melody'
import { compasso } from '../music/rhythm'
import { registrar } from '../store'

export const NIVEIS_PIANO = ['Nota isolada (5 notas)', 'Nota isolada (pentagrama todo)', 'Sequências de 4 notas', 'Sequências de 8 notas', 'Pequenas melodias com ritmo e armadura']
const RODADA = 8
const FAIXA: Record<Clef, [number, number][]> = {
  treble: [[n('c/4'), n('g/4')], [n('a/3'), n('g/5')], [n('c/4'), n('c/5')], [n('c/4'), n('e/5')], [n('c/4'), n('d/5')]],
  bass: [[n('c/3'), n('g/3')], [n('e/2'), n('c/4')], [n('c/3'), n('c/4')], [n('g/2'), n('d/4')], [n('c/3'), n('d/4')]],
}

interface Exercicio { pitches: Pitch[]; melodia?: Melodia; isolada: boolean }

function passeio([lo, hi]: [number, number], qtd: number, salto: number): number[] {
  const out: number[] = []
  let d = lo + Math.floor(Math.random() * (hi - lo + 1))
  for (let i = 0; i < qtd; i++) {
    out.push(d)
    let prox = d
    while (prox === d) prox = Math.max(lo, Math.min(hi, d + Math.floor(Math.random() * (2 * salto + 1)) - salto))
    d = prox
  }
  return out
}

function gerar(nivel: number, clef: Clef): Exercicio {
  const faixa = FAIXA[clef][nivel - 1]
  if (nivel <= 2) return { pitches: passeio(faixa, RODADA, 7).map((d) => P(d)), isolada: true }
  if (nivel <= 4) return { pitches: passeio(faixa, nivel === 3 ? 4 : 8, 2).map((d) => P(d)), isolada: false }
  const mel = gerarMelodia({ compasso: compasso(rand(['3/4', '4/4'])), nCompassos: 2, nivelRitmo: 1, faixa, armadura: armadura(rand(['C', 'G', 'F'])) })
  return { pitches: mel.eventos.filter((e) => e.pitch).map((e) => e.pitch!), melodia: mel, isolada: false }
}

export default function PianoReading({ clef }: { clef: Clef }) {
  const skill = clef === 'treble' ? 'piano-sol' : 'piano-fa'
  const lv = useNivel(skill, NIVEIS_PIANO.length, NIVEIS_PIANO)
  const [ex, setEx] = useState<Exercicio>(() => gerar(lv.nivel, clef))
  const [pos, setPos] = useState(0)
  const [erros, setErros] = useState<number[]>([])
  const [errouAgora, setErrouAgora] = useState<number | null>(null)
  const [marks, setMarks] = useState<Record<number, Marca>>({})
  const [nomes, setNomes] = useState(false)
  const inicio = useRef<number | null>(null)
  const [tempo, setTempo] = useState(0)

  const novo = (nv = lv.nivel) => {
    setEx(gerar(nv, clef))
    setPos(0); setErros([]); setMarks({}); setErrouAgora(null)
    inicio.current = null
  }

  const qtd = ex.pitches.length
  const fim = pos >= qtd
  const totalErros = erros.reduce((a, b) => a + (b ?? 0), 0)
  const precisao = Math.round((qtd / (qtd + totalErros)) * 100)

  function onNote(m: number) {
    if (fim) return
    inicio.current ??= performance.now()
    const alvo = midiP(ex.pitches[pos])
    if (m === alvo) {
      setMarks({ [m]: 'ok' })
      setErrouAgora(null)
      const np = pos + 1
      setPos(np)
      if (np >= qtd) {
        setTempo((performance.now() - (inicio.current ?? performance.now())) / 1000)
        const p = Math.round((qtd / (qtd + totalErros)) * 100)
        registrar(skill, { melhor: p, acertos: qtd, tentativas: qtd + totalErros })
        lv.registrarNivel(p >= 80)
      }
    } else {
      setMarks({ [m]: 'erro' })
      setErrouAgora(m)
      setErros((e) => { const c = [...e]; c[pos] = (c[pos] ?? 0) + 1; return c })
    }
  }

  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Enter' && fim) novo() }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })

  const cor = (i: number) => (i < pos ? (erros[i] ? '#d97706' : '#16a34a') : i === pos ? (errouAgora !== null ? '#dc2626' : '#2563eb') : undefined)
  let measures: SNote[][]
  let time: string | null = '4/4'
  let keySig: string | null = null
  if (ex.melodia) {
    const idxSom = ex.melodia.eventos.map((e, i) => (e.pitch ? i : -1)).filter((i) => i >= 0)
    measures = melodiaParaStaff(ex.melodia, (i) => cor(idxSom.indexOf(i)), (i) => (idxSom.indexOf(i) < pos && ex.melodia!.eventos[i].pitch ? nomeP(ex.melodia!.eventos[i].pitch!) : undefined))
    time = ex.melodia.compasso.id
    keySig = ex.melodia.armadura?.vex ?? null
  } else if (ex.isolada) {
    time = null
    const p = ex.pitches[Math.min(pos, qtd - 1)]
    measures = [[{ keys: [vexKey(p.d)], dur: 'w', color: fim ? '#16a34a' : errouAgora !== null ? '#dc2626' : undefined }]]
  } else {
    const notas = ex.pitches.map((p, i) => ({ keys: [vexKey(p.d)], dur: 'q', color: cor(i), label: i < pos ? nomeP(p) : undefined }))
    measures = qtd <= 4 ? [notas] : [notas.slice(0, 4), notas.slice(4)]
  }

  const mids = ex.pitches.map(midiP)
  const lo = Math.min(...mids), hi = Math.max(...mids)
  const from = Math.min(lo - (lo % 12), clef === 'treble' ? 60 : 48)
  const to = Math.max(hi + ((12 - (hi % 12)) % 12), from + 12)
  const alvo = !fim ? midiP(ex.pitches[pos]) : null
  const dicaMarks = nomes && alvo !== null ? { ...marks, [alvo]: marks[alvo] ?? ('dica' as Marca) } : marks
  const nomeTocado = errouAgora !== null ? nomesMidi(errouAgora) : null

  return (
    <div className="exercise">
      <Niveis nomes={NIVEIS_PIANO} nivel={lv.nivel} max={lv.max} progresso={lv.progresso} onChange={(nv) => { lv.setNivel(nv); novo(nv) }} />
      <div className="toolbar">
        <label className="check"><input type="checkbox" checked={nomes} onChange={(e) => setNomes(e.target.checked)} /> Ajuda (nomes e dica)</label>
        {!ex.isolada && <button className="btn small" onClick={() => (ex.melodia ? tocarSequencia(melodiaParaSom(ex.melodia), { compasso: ex.melodia.compasso, bpm: 80 }) : tocarSequencia(ex.pitches.map((p, i) => ({ t: i, dur: 1, notas: [toneNameP(p)] })), { bpm: 90 }))}>▶ Ouvir</button>}
      </div>
      <h2 className="prompt">{fim ? 'Muito bem!' : ex.isolada ? 'Toque esta nota no piano' : 'Toque no piano a nota azul'}</h2>
      <div className={'staff-box' + (ex.isolada ? ' big' : '')}>
        <Staff clef={clef} time={time} keySig={keySig} measures={measures} width={ex.isolada ? 320 : 560} height={150} y={20} />
      </div>
      <div className="feedback" aria-live="polite">
        {fim ? (
          <span className="ok">Precisão {precisao}% · {totalErros} erro(s) · {tempo.toFixed(1)} s</span>
        ) : nomeTocado ? <span className="erro">Você tocou {nomeTocado.sust}{nomeTocado.bem ? ` / ${nomeTocado.bem}` : ''}. Olhe de novo a posição da nota{keySig ? ' e a armadura' : ''}.</span>
          : <span className="muted">Nota {pos + 1} de {qtd}</span>}
      </div>
      <Piano from={from} to={to} onNote={onNote} marks={dicaMarks} labels={nomes} />
      <div className="row center">
        {fim ? <button className="btn primary" onClick={() => novo()}>Nova rodada (Enter)</button>
          : <button className="btn" onClick={() => novo()}>Gerar outra sequência</button>}
      </div>
      <p className="muted small center">Teclado do computador: A S D F G H J K = Dó Ré Mi Fá Sol Lá Si Dó (pretas: W E T Y U). Teclado MIDI também funciona.</p>
    </div>
  )
}
