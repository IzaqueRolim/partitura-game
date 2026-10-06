// Desenho editável da partitura (uma pauta ou sistema de piano com duas pautas),
// com seleção de notas por clique, inserção pela posição do clique e destaque das notas tocando.
import { useEffect, useRef, useState } from 'react'
import {
  Accidental, Beam, Dot, Formatter, GhostNote, Renderer, Stave, StaveConnector, StaveNote, StaveTie, Voice,
} from 'vexflow/bravura'
import { armadura as armaduraPorVex, BASE_LINHA, vexKeyP, type Clef } from '../music/notes'
import { acidentesDoCompasso, capacidade, comArmadura, nomeAltura, soma, totalCompassos, type PartituraE, type Sel } from '../music/escritor'
import type { Dur } from '../music/rhythm'

interface Regiao { pauta: number; compasso: number; x0: number; x1: number; xNotas0: number; yTop: number; yBot: number; y0: number; sp: number; clef: Clef; notasX: number[] }

interface Props {
  p: PartituraE
  sel: Sel | null
  tocando?: Set<string>
  onSelecionar: (s: Sel) => void
  onClicarPosicao: (s: Sel, d: number) => void
}

const COR_SEL = '#2563eb'
const COR_TOCA = '#16a34a'
const COR_INCOMPLETO = '#d97706'
const FIG: [Dur, number, number][] = [['w', 0, 4], ['h', 1, 3], ['h', 0, 2], ['q', 1, 1.5], ['q', 0, 1], ['8', 1, 0.75], ['8', 0, 0.5], ['16', 0, 0.25]]

/** preenche o espaço que falta no compasso com notas invisíveis (alinha as pautas e reserva o espaço) */
function fantasmas(falta: number): GhostNote[] {
  const out: GhostNote[] = []
  let r = falta
  for (const [dur, dots, v] of FIG) while (r + 1e-9 >= v) {
    const g = new GhostNote({ duration: dur + (dots ? 'd' : '') })
    if (dots) Dot.buildAndAttach([g], { all: true })
    out.push(g)
    r -= v
  }
  return out
}

export default function EditorPauta({ p, sel, tocando, onSelecionar, onClicarPosicao }: Props) {
  const caixa = useRef<HTMLDivElement>(null)
  const fora = useRef<HTMLDivElement>(null)
  const regioes = useRef<Regiao[]>([])
  const [cw, setCw] = useState(0)
  const [cursor, setCursor] = useState<{ x: number; y: number; h: number } | null>(null)
  const [dica, setDica] = useState<{ x: number; y: number; texto: string } | null>(null)

  useEffect(() => {
    const el = fora.current
    if (!el) return
    const ro = new ResizeObserver(() => setCw(Math.round(el.clientWidth)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const tocandoKey = tocando ? [...tocando].join(',') : ''
  useEffect(() => {
    const el = caixa.current
    if (!el || !cw) return
    el.innerHTML = ''
    const W = Math.max(320, cw)
    const arm = armaduraPorVex(p.armadura)
    const [num, den] = p.compasso.split('/').map(Number)
    const nP = p.pautas.length
    const total = totalCompassos(p)
    const cap = capacidade(p)
    const extraLinha = 42 + (arm.qtd ? arm.qtd * 10 + 8 : 0)
    const extraTempo = 30
    const porLinha = Math.max(1, Math.min(total, Math.floor((W - extraLinha - extraTempo) / 210)))
    const linhas = Math.ceil(total / porLinha)
    const alturaPauta = 95
    const alturaLinha = nP * alturaPauta + 45
    const H = linhas * alturaLinha + 30

    const renderer = new Renderer(el, Renderer.Backends.SVG)
    renderer.resize(W, H)
    const ctx = renderer.getContext()
    const regs: Regiao[] = []
    const todas: { nota: StaveNote; id: string; liga?: boolean; linha: number }[][] = p.pautas.map(() => [])
    let cursorPos: { x: number; y: number; h: number } | null = null

    for (let ci = 0; ci < total; ci++) {
      const linha = Math.floor(ci / porLinha)
      const col = ci % porLinha
      const extra = col === 0 ? extraLinha + (linha === 0 ? extraTempo : 0) : 0
      const extraRow = extraLinha + (linha === 0 ? extraTempo : 0)
      const margem = nP > 1 ? 24 : 6 // espaço para a chave (brace) do sistema de piano
      const larg = (W - margem - 6 - extraRow) / porLinha
      const x = margem + (col === 0 ? 0 : extraRow + col * larg)
      const w = larg + extra
      const staves = p.pautas.map((pt, pi) => {
        const st = new Stave(x, 20 + linha * alturaLinha + pi * alturaPauta, w)
        if (col === 0) {
          st.addClef(pt.clef)
          if (arm.qtd) st.addKeySignature(p.armadura)
          if (linha === 0) st.addTimeSignature(p.compasso)
        }
        if (pi === 0) st.setMeasure(ci + 1)
        if (ci === total - 1) st.setEndBarType(3)
        st.setStyle({ strokeStyle: '#555', fillStyle: '#222' })
        return st
      })
      // alinha o início das notas entre as pautas do sistema
      const inicio = Math.max(...staves.map((s) => s.getNoteStartX()))
      staves.forEach((s) => s.setNoteStartX(inicio))
      staves.forEach((s) => s.setContext(ctx).draw())
      if (nP > 1) {
        if (col === 0) {
          new StaveConnector(staves[0], staves[nP - 1]).setType('brace').setContext(ctx).draw()
          new StaveConnector(staves[0], staves[nP - 1]).setType('singleLeft').setContext(ctx).draw()
        }
        new StaveConnector(staves[0], staves[nP - 1]).setType(ci === total - 1 ? 'boldDoubleRight' : 'singleRight').setContext(ctx).draw()
      }

      const vozes: Voice[] = []
      const porPauta: { notas: StaveNote[]; reais: StaveNote[] }[] = []
      p.pautas.forEach((pt, pi) => {
        const c = pt.compassos[ci] ?? []
        const acs = acidentesDoCompasso(c, arm)
        const incompleto = c.length > 0 && soma(c) < cap - 1e-9 && ci < total - 1
        const reais = c.map((x, i) => {
          const ordem = x.alturas.map((a, k) => ({ a, k })).sort((u, v) => u.a.d - v.a.d || u.a.acc - v.a.acc)
          const sn = new StaveNote({
            keys: x.rest ? [pt.clef === 'bass' ? 'd/3' : 'b/4'] : ordem.map(({ a }) => vexKeyP(a)),
            duration: x.dur + (x.dots ? 'd' : '') + (x.rest ? 'r' : ''),
            clef: pt.clef, auto_stem: true, dots: x.dots,
            align_center: x.rest && x.dur === 'w' && c.length === 1,
          })
          if (!x.rest) ordem.forEach(({ k }, j) => { const s = acs[i][k]; if (s) sn.addModifier(new Accidental(s), j) })
          if (x.dots) Dot.buildAndAttach([sn], { all: true })
          const selecionada = sel && sel.pauta === pi && sel.compasso === ci && sel.idx === i
          const cor = tocando?.has(x.id) ? COR_TOCA : selecionada ? COR_SEL : incompleto ? COR_INCOMPLETO : undefined
          if (cor) sn.setStyle({ fillStyle: cor, strokeStyle: cor })
          todas[pi].push({ nota: sn, id: x.id, liga: x.liga, linha })
          return sn
        })
        const notas: StaveNote[] = [...reais, ...(fantasmas(Math.max(0, cap - soma(c))) as unknown as StaveNote[])]
        const v = new Voice({ num_beats: num, beat_value: den }).setMode(Voice.Mode.SOFT)
        if (notas.length) v.addTickables(notas)
        vozes.push(v)
        porPauta.push({ notas, reais })
      })
      const fmt = new Formatter()
      vozes.forEach((v) => fmt.joinVoices([v]))
      fmt.format(vozes, Math.max(40, staves[0].getNoteEndX() - inicio - 12))
      vozes.forEach((v, pi) => {
        if (!porPauta[pi].notas.length) return
        v.draw(ctx, staves[pi])
        Beam.generateBeams(porPauta[pi].reais.filter((sn) => !sn.isRest()), { groups: Beam.getDefaultBeamGroups(p.compasso) }).forEach((b) => b.setContext(ctx).draw())
        // repinta haste/feixe das notas coloridas
        porPauta[pi].reais.forEach((sn) => {
          const st = sn.getStyle()
          if (!st?.fillStyle) return
          const g = (sn as unknown as { getSVGElement?: () => SVGElement | undefined }).getSVGElement?.()
          g?.querySelectorAll('path,rect').forEach((el2) => { el2.setAttribute('fill', st.fillStyle!); el2.setAttribute('stroke', st.fillStyle!) })
        })
      })

      staves.forEach((st, pi) => {
        const notasX = porPauta[pi].reais.map((sn) => sn.getAbsoluteX() + sn.getGlyphWidth() / 2)
        regs.push({
          pauta: pi, compasso: ci, x0: st.getX(), x1: st.getX() + st.getWidth(), xNotas0: inicio,
          yTop: st.getYForLine(0), yBot: st.getYForLine(4), y0: st.getYForNote(0), sp: st.getSpacingBetweenLines(), clef: p.pautas[pi].clef, notasX,
        })
        // cursor de inserção: logo depois da nota selecionada (ou no início do compasso)
        if (sel && sel.pauta === pi && sel.compasso === ci) {
          const xs = notasX
          const cx = sel.idx < 0 ? inicio - 4 : (xs[sel.idx] ?? inicio) + 14
          cursorPos = { x: cx, y: st.getYForLine(0) - 14, h: st.getYForLine(4) - st.getYForLine(0) + 28 }
        }
      })
    }

    // ligaduras de valor (também entre compassos; na troca de linha, desenha meia ligadura)
    todas.forEach((lista) => lista.forEach((it, i) => {
      if (!it.liga) return
      const prox = lista[i + 1]
      if (prox && prox.linha === it.linha) new StaveTie({ first_note: it.nota, last_note: prox.nota, first_indices: [0], last_indices: [0] }).setContext(ctx).draw()
      else new StaveTie({ first_note: it.nota, last_note: null, first_indices: [0], last_indices: [0] }).setContext(ctx).draw()
    }))

    regioes.current = regs
    setCursor(cursorPos)
    const svg = el.querySelector('svg')
    svg?.setAttribute('viewBox', `0 0 ${W} ${H}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, sel, tocandoKey, cw])

  function localizar(e: React.PointerEvent) {
    const svg = caixa.current?.querySelector('svg')
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const q = pt.matrixTransform(ctm.inverse())
    let melhor: Regiao | null = null
    let dist = Infinity
    for (const r of regioes.current) {
      if (q.x < r.x0 || q.x > r.x1) continue
      const dy = q.y < r.yTop ? r.yTop - q.y : q.y > r.yBot ? q.y - r.yBot : 0
      if (dy < dist && dy < 45) { dist = dy; melhor = r }
    }
    if (!melhor) return null
    const line = Math.round(((melhor.y0 - q.y) / melhor.sp) * 2) / 2
    const d = BASE_LINHA[melhor.clef] + Math.round(line * 2)
    const perto = melhor.notasX.findIndex((x) => Math.abs(x - q.x) < 11)
    const antes = melhor.notasX.filter((x) => x < q.x).length - 1
    return { r: melhor, d, perto, antes, x: q.x, y: q.y }
  }

  return (
    <div ref={fora} className="editor-pauta">
      <div
        ref={caixa}
        onPointerDown={(e) => {
          const l = localizar(e)
          if (!l) return
          if (l.perto >= 0) onSelecionar({ pauta: l.r.pauta, compasso: l.r.compasso, idx: l.perto })
          else onClicarPosicao({ pauta: l.r.pauta, compasso: l.r.compasso, idx: l.antes }, l.d)
        }}
        onPointerMove={(e) => {
          if (e.pointerType !== 'mouse') return
          const l = localizar(e)
          if (!l || l.perto >= 0) return setDica(null)
          setDica({ x: l.x, y: l.y, texto: nomeAltura(comArmadura(armaduraPorVex(p.armadura), l.d)) })
        }}
        onPointerLeave={() => setDica(null)}
      />
      {cursor && <div className="cursor-editor" style={{ left: cursor.x, top: cursor.y, height: cursor.h }} />}
      {dica && <div className="dica-altura" style={{ left: dica.x + 12, top: dica.y - 26 }}>{dica.texto}</div>}
    </div>
  )
}
