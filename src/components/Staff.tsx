// Pentagrama renderizado com VexFlow (SVG, escala automática com a largura da tela).
// Suporta: clave, armadura, fórmula de compasso, quebra de linha, acidentes, articulações,
// dinâmicas, ligaduras, crescendo/diminuendo, barras de repetição e indicação de andamento.
import { useEffect, useRef, useState } from 'react'
import {
  Accidental, Annotation, Articulation, BarlineType, Beam, Curve, Dot, Formatter, Modifier, Renderer, Stave,
  StaveHairpin, StaveNote, StaveTie, Voice,
} from 'vexflow/bravura'
import { ARMADURAS } from '../music/notes'

export interface SNote {
  keys: string[]
  dur: string // 'w' | 'h' | 'q' | '8' | '16'
  rest?: boolean
  dots?: number
  color?: string
  label?: string
  labelTop?: string
  /** acidente desenhado: '#', 'b', 'n', '##', 'bb' */
  acc?: string
  /** articulações VexFlow: 'a.' staccato, 'a>' acento, 'a-' tenuto, 'a@a' fermata */
  artic?: string[]
  /** dinâmica: 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' */
  dyn?: string
}

export interface StaffLayout {
  width: number
  height: number
  /** x central de cada nota, por compasso */
  noteX: number[][]
  /** [início das notas, fim] de cada compasso */
  measureX: [number, number][]
  /** linha (sistema) de cada compasso e [topo, base] de cada linha */
  measureRow: number[]
  rowY: [number, number][]
}

export interface StaffExtras {
  /** ligaduras entre notas (índices globais, contando todas as notas em ordem) */
  ligaduras?: { de: number; ate: number; tipo: 'tie' | 'slur' }[]
  hairpins?: { de: number; ate: number; tipo: 'cresc' | 'dim' }[]
  repeticao?: { inicio?: boolean; fim?: boolean }
  tempo?: { nome?: string; bpm?: number }
}

export interface StaffProps extends StaffExtras {
  clef?: 'treble' | 'bass' | 'percussion' | null
  time?: string | null
  keySig?: string | null
  measures: SNote[][]
  /** largura lógica (unidades SVG). Menor = desenho maior na tela. */
  width?: number
  /** altura de cada linha (sistema) */
  height?: number
  y?: number
  /** se definido, quebra em várias linhas mantendo cada compasso com pelo menos essa largura */
  minMeasureWidth?: number
}

interface Props extends StaffProps {
  onLayout?: (l: StaffLayout) => void
  /** posição do ponteiro em "linhas" do VexFlow (0 = 1ª linha suplementar inferior; 1 = 1ª linha) */
  onPointer?: (kind: 'move' | 'click' | 'leave', line: number | null, e: React.PointerEvent) => void
  className?: string
  children?: React.ReactNode
}

const DYN_FONT = 'Times New Roman, Georgia, serif'

export default function Staff(props: Props) {
  const { clef = 'treble', time = null, keySig = null, measures, width = 600, height = 150, y = 20, minMeasureWidth, onLayout, onPointer, className, children } = props
  const { ligaduras, hairpins, repeticao, tempo } = props
  const box = useRef<HTMLDivElement>(null)
  const geom = useRef<{ y0: number; sp: number } | null>(null)
  const outer = useRef<HTMLDivElement>(null)
  const [cw, setCw] = useState(0)
  // no celular, usa largura lógica menor (= notas maiores na tela)
  useEffect(() => {
    const el = outer.current
    if (!el) return
    const ro = new ResizeObserver(() => setCw(Math.round(el.clientWidth / 10) * 10))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const minW = Math.min(width, 300 + Math.min(measures.length, 4) * 30)
  const W = Math.round(Math.min(width, Math.max(minW, cw || width)))
  const key = JSON.stringify({ clef, time, keySig, measures, W, height, y, minMeasureWidth, ligaduras, hairpins, repeticao, tempo })

  useEffect(() => {
    const el = box.current
    if (!el) return
    el.innerHTML = ''
    const list = measures.length ? measures : [[]]
    const nAcc = keySig ? (ARMADURAS.find((a) => a.vex === keySig)?.qtd ?? 0) : 0
    const extraLinha = (clef ? 38 : 0) + (nAcc ? nAcc * 10 + 6 : 0)
    const extraTempo = time ? 26 : 0
    const porLinha = minMeasureWidth ? Math.max(1, Math.min(list.length, Math.floor((W - extraLinha - extraTempo - 2) / minMeasureWidth))) : list.length
    const linhas = Math.ceil(list.length / porLinha)
    const H = height * linhas

    const renderer = new Renderer(el, Renderer.Backends.SVG)
    renderer.resize(W, H)
    const ctx = renderer.getContext()
    const svg = el.querySelector('svg')!
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    svg.removeAttribute('width')
    svg.removeAttribute('height')
    svg.style.width = '100%'
    svg.style.height = 'auto'
    svg.style.display = 'block'

    const [num, den] = (time ?? '4/4').split('/').map(Number)
    const noteClef = clef === 'bass' ? 'bass' : 'treble'
    const layout: StaffLayout = { width: W, height: H, noteX: [], measureX: [], measureRow: [], rowY: [] }
    const todas: StaveNote[] = []

    list.forEach((m, mi) => {
      const row = Math.floor(mi / porLinha)
      const col = mi % porLinha
      const inicioLinha = col === 0
      const extraRow = extraLinha + (row === 0 ? extraTempo : 0)
      const largRow = (W - 2 - extraRow) / porLinha
      const w = largRow + (inicioLinha ? extraRow : 0)
      const x = 1 + (inicioLinha ? 0 : extraRow + col * largRow)
      const stave = new Stave(x, y + row * height, w)
      if (inicioLinha && clef) stave.addClef(clef)
      if (inicioLinha && keySig && nAcc) stave.addKeySignature(keySig)
      if (mi === 0 && time) stave.addTimeSignature(time)
      if (mi === 0 && tempo) stave.setTempo({ name: tempo.nome, duration: tempo.bpm ? 'q' : undefined, bpm: tempo.bpm }, -8)
      if (mi === 0 && repeticao?.inicio) stave.setBegBarType(BarlineType.REPEAT_BEGIN)
      if (mi === list.length - 1) {
        if (repeticao?.fim) stave.setEndBarType(BarlineType.REPEAT_END)
        else if (list.length > 1) stave.setEndBarType(BarlineType.END)
      }
      stave.setStyle({ strokeStyle: '#555', fillStyle: '#222' })
      stave.setContext(ctx).draw()
      if (mi === 0) geom.current = { y0: stave.getYForNote(0), sp: stave.getSpacingBetweenLines() }
      if (inicioLinha) layout.rowY.push([stave.getYForLine(0) - 18, stave.getYForLine(4) + 18])

      const notes = m.map((s) => {
        const sn = new StaveNote({
          keys: s.rest ? [noteClef === 'bass' ? 'd/3' : 'b/4'] : s.keys,
          duration: s.dur + (s.rest ? 'r' : ''),
          clef: noteClef,
          auto_stem: true,
          dots: s.dots,
          align_center: s.dur === 'w' && !!s.rest && m.length === 1,
        })
        if (s.acc && !s.rest) sn.addModifier(new Accidental(s.acc), 0)
        if (s.dots) Dot.buildAndAttach([sn], { all: true })
        s.artic?.forEach((code) => {
          const a = new Articulation(code)
          const fermata = code.startsWith('a@')
          a.setPosition(fermata || sn.getStemDirection() < 0 ? Modifier.Position.ABOVE : Modifier.Position.BELOW)
          sn.addModifier(a, 0)
        })
        if (s.color) sn.setStyle({ fillStyle: s.color, strokeStyle: s.color })
        if (s.label) sn.addModifier(new Annotation(s.label).setFont('Inter, Arial', 12).setVerticalJustification(Annotation.VerticalJustify.BOTTOM), 0)
        if (s.dyn) sn.addModifier(new Annotation(s.dyn).setFont(DYN_FONT, 17, 'bold', 'italic').setVerticalJustification(Annotation.VerticalJustify.BOTTOM), 0)
        if (s.labelTop) sn.addModifier(new Annotation(s.labelTop).setFont('Inter, Arial', 11).setVerticalJustification(Annotation.VerticalJustify.TOP), 0)
        return sn
      })

      if (notes.length) {
        const voice = new Voice({ num_beats: num, beat_value: den }).setMode(Voice.Mode.SOFT)
        voice.addTickables(notes)
        const beams = Beam.generateBeams(notes, { groups: Beam.getDefaultBeamGroups(time ?? '4/4') })
        new Formatter().joinVoices([voice]).formatToStave([voice], stave)
        voice.draw(ctx, stave)
        beams.forEach((b) => b.setContext(ctx).draw())
        // pinta hastes/feixes com a cor da nota
        m.forEach((s, i) => {
          if (!s.color) return
          const g = (notes[i] as unknown as { getSVGElement?: () => SVGElement | undefined }).getSVGElement?.()
          g?.querySelectorAll('path,rect').forEach((p) => {
            p.setAttribute('fill', s.color!)
            p.setAttribute('stroke', s.color!)
          })
        })
      }
      todas.push(...notes)
      layout.noteX.push(notes.map((sn) => sn.getAbsoluteX() + sn.getGlyphWidth() / 2))
      layout.measureX.push([stave.getNoteStartX(), stave.getNoteEndX()])
      layout.measureRow.push(row)
    })

    // ligaduras e crescendo/diminuendo (entre notas já desenhadas)
    const nota = (i: number) => todas[Math.max(0, Math.min(todas.length - 1, i))]
    ligaduras?.forEach((l) => {
      if (!todas.length) return
      if (l.tipo === 'tie') new StaveTie({ first_note: nota(l.de), last_note: nota(l.ate), first_indices: [0], last_indices: [0] }).setContext(ctx).draw()
      else new Curve(nota(l.de), nota(l.ate), { cps: [{ x: 0, y: 12 }, { x: 0, y: 12 }] }).setContext(ctx).draw()
    })
    hairpins?.forEach((h) => {
      if (!todas.length) return
      const hp = new StaveHairpin({ first_note: nota(h.de), last_note: nota(h.ate) }, h.tipo === 'cresc' ? StaveHairpin.type.CRESC : StaveHairpin.type.DECRESC)
      hp.setContext(ctx).setPosition(Modifier.Position.BELOW)
      hp.setRenderOptions({ height: 10, y_shift: 6, left_shift_px: 0, right_shift_px: 0, right_shift_ticks: 0, left_shift_ticks: 0 })
      hp.draw()
    })
    onLayout?.(layout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  function linha(e: React.PointerEvent): number | null {
    const svg = box.current?.querySelector('svg')
    const g = geom.current
    if (!svg || !g) return null
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const p = pt.matrixTransform(ctm.inverse())
    return Math.round(((g.y0 - p.y) / g.sp) * 2) / 2
  }

  return (
    <div ref={outer} className={'staff ' + (className ?? '')} style={{ position: 'relative' }}>
      <div
        ref={box}
        onPointerMove={onPointer ? (e) => onPointer('move', linha(e), e) : undefined}
        onPointerDown={onPointer ? (e) => onPointer('click', linha(e), e) : undefined}
        onPointerLeave={onPointer ? (e) => onPointer('leave', null, e) : undefined}
        style={{ cursor: onPointer ? 'pointer' : undefined, touchAction: onPointer ? 'none' : undefined }}
      />
      {children}
    </div>
  )
}
