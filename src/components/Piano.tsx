// Teclado de piano: mouse/toque, teclado do computador e teclado MIDI (Web MIDI).
import { useEffect, useRef, useState } from 'react'
import { tocar, initAudio } from '../music/audio'
import { NOMES, toneDeMidi } from '../music/notes'

const PRETAS = new Set([1, 3, 6, 8, 10])
const GRAU_BRANCA: Record<number, number> = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 }
export const midiToTone = toneDeMidi

// mapa do teclado do computador (a partir do 1º Dó visível)
const BRANCAS_PC = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ç', ';']
const PRETAS_PC: Record<string, number> = { w: 1, e: 3, t: 6, y: 8, u: 10, o: 13, p: 15 }

export type Marca = 'ok' | 'erro' | 'dica'

interface Props {
  from: number
  to: number
  onNote?: (midi: number) => void
  marks?: Record<number, Marca>
  labels?: boolean
  sound?: boolean
  computerKeys?: boolean
}

export default function Piano({ from, to, onNote, marks = {}, labels = false, sound = true, computerKeys = true }: Props) {
  const [pressed, setPressed] = useState<Set<number>>(new Set())
  const cb = useRef(onNote)
  cb.current = onNote
  const scroller = useRef<HTMLDivElement>(null)

  const press = (m: number) => {
    initAudio()
    if (sound) tocar(midiToTone(m), '2n')
    cb.current?.(m)
    setPressed((p) => new Set(p).add(m))
    setTimeout(() => setPressed((p) => { const q = new Set(p); q.delete(m); return q }), 180)
  }
  const pressRef = useRef(press)
  pressRef.current = press

  // teclado do computador
  useEffect(() => {
    if (!computerKeys) return
    const base = from + ((12 - (from % 12)) % 12) // 1º Dó
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      const wi = BRANCAS_PC.indexOf(k)
      let m: number | null = null
      if (wi >= 0) {
        const brancas = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17]
        m = base + brancas[wi]
      } else if (k in PRETAS_PC) m = base + PRETAS_PC[k]
      if (m !== null && m >= from && m <= to) {
        e.preventDefault()
        pressRef.current(m)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [from, to, computerKeys])

  // teclado MIDI (Chrome/Edge/Android). Safari/iOS não suporta Web MIDI.
  useEffect(() => {
    const nav = navigator as Navigator & { requestMIDIAccess?: () => Promise<MIDIAccess> }
    if (!nav.requestMIDIAccess) return
    let access: MIDIAccess | null = null
    const handler = (ev: MIDIMessageEvent) => {
      const [st, note, vel] = ev.data ?? []
      if ((st & 0xf0) === 0x90 && vel > 0) pressRef.current(note)
    }
    nav.requestMIDIAccess().then((a) => {
      access = a
      a.inputs.forEach((i) => (i.onmidimessage = handler))
      a.onstatechange = () => a.inputs.forEach((i) => (i.onmidimessage = handler))
    }).catch(() => {})
    return () => access?.inputs.forEach((i) => (i.onmidimessage = null))
  }, [])

  // centraliza o teclado no celular
  useEffect(() => {
    const s = scroller.current
    if (s) s.scrollLeft = (s.scrollWidth - s.clientWidth) / 2
  }, [from, to])

  const brancas: number[] = []
  for (let m = from; m <= to; m++) if (!PRETAS.has(m % 12)) brancas.push(m)

  return (
    <div className="piano-scroll" ref={scroller}>
      <div className="piano" style={{ ['--n' as string]: brancas.length }}>
        {brancas.map((m, i) => {
          const temPreta = m + 1 <= to && PRETAS.has((m + 1) % 12)
          const g = GRAU_BRANCA[m % 12]
          const oit = Math.floor(m / 12) - 1
          return (
            <div key={m} className="white-wrap">
              <button
                className={`key white ${pressed.has(m) ? 'down' : ''} ${marks[m] ?? ''}`}
                onPointerDown={(e) => { e.preventDefault(); press(m) }}
                aria-label={`${NOMES[g]}${oit}`}
                data-midi={m}
              >
                {labels ? <span>{NOMES[g]}</span> : g === 0 ? <span className="c-label">Dó{oit}</span> : null}
              </button>
              {temPreta && (
                <button
                  className={`key black ${pressed.has(m + 1) ? 'down' : ''} ${marks[m + 1] ?? ''}`}
                  onPointerDown={(e) => { e.preventDefault(); press(m + 1) }}
                  aria-label={`${NOMES[g]}♯${oit}`}
                  data-midi={m + 1}
                  style={{ zIndex: 2 + i }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
