// Escritor de partituras: o aluno escreve a partitura (clicando no pentagrama, no piano ou pelo teclado)
// e o app toca no piano, com metrônomo e andamento escolhidos. Valida a duração de cada compasso.
import { useCallback, useEffect, useRef, useState } from 'react'
import EditorPauta from '../components/EditorPauta'
import Piano, { type Marca } from '../components/Piano'
import Staff from '../components/Staff'
import { SeletorCompasso } from '../components/Controles'
import { agora, initAudio, tocar as tocarNota } from '../music/audio'
import { pararSom, tocarSequencia } from '../music/player'
import { ARMADURAS, armadura as armaduraPorVex, midiP, toneNameP, type Acc, type Pitch } from '../music/notes'
import { compasso as compassoPorId, fmtDuracao, nomeFigura, valorPulso, type Compasso, type Dur } from '../music/rhythm'
import {
  adicionarCompasso, alterar, alturaReferencia, apagarPartitura, capacidade, comArmadura, exemploOde, exportarMusicXML, formula,
  grafarMidi, inserir, letraProxima, listarPartituras, mover, nomeAltura, notaEm, novaPartitura, novoId, paraSom, remover,
  removerCompasso, salvarPartitura, soma, totalCompassos, transpor,
  type FormatoPautas, type NotaE, type PartituraE, type Sel,
} from '../music/escritor'
import { registrar } from '../store'

const DURACOES: { dur: Dur; tecla: string }[] = [
  { dur: 'w', tecla: '7' }, { dur: 'h', tecla: '6' }, { dur: 'q', tecla: '5' }, { dur: '8', tecla: '4' }, { dur: '16', tecla: '3' },
]
type Estado = 'parado' | 'tocando'

function primeiraPartitura(): PartituraE {
  return listarPartituras()[0] ?? exemploOde()
}

export default function Escritor() {
  const [p, setPState] = useState<PartituraE>(primeiraPartitura)
  const [sel, setSel] = useState<Sel>(() => ({ pauta: 0, compasso: 0, idx: -1 }))
  const [dur, setDur] = useState<Dur>('q')
  const [ponto, setPonto] = useState(false)
  const [acorde, setAcorde] = useState(false)
  // true quando o aluno escolheu uma nota (clique/setas): a paleta passa a editar essa nota;
  // logo depois de escrever, a paleta só define a figura da PRÓXIMA nota
  const [editando, setEditando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [lista, setLista] = useState<PartituraE[]>(listarPartituras)
  const [criando, setCriando] = useState(false)
  // reprodução
  const [estado, setEstado] = useState<Estado>('parado')
  const [bpm, setBpm] = useState(p.bpm)
  const [metronomo, setMetronomo] = useState(true)
  const [contagem, setContagem] = useState(true)
  const [doInicio, setDoInicio] = useState(true)
  const [tocando, setTocando] = useState<Set<string>>(new Set())
  const [marksTocando, setMarksTocando] = useState<Record<number, Marca>>({})
  const raf = useRef(0)
  const desfazer = useRef<PartituraE[]>([])
  const refazer = useRef<PartituraE[]>([])

  const arm = armaduraPorVex(p.armadura)
  const c: Compasso = formula(p)
  const cap = capacidade(p)

  // ── estado da partitura com histórico (desfazer/refazer) e salvamento automático
  const setP = useCallback((novo: PartituraE, registrarHist = true) => {
    setPState((atual) => {
      if (registrarHist) {
        desfazer.current = [...desfazer.current.slice(-80), atual]
        refazer.current = []
      }
      return novo
    })
  }, [])
  useEffect(() => {
    const t = setTimeout(() => { salvarPartitura(p); setLista(listarPartituras()) }, 400)
    return () => clearTimeout(t)
  }, [p])

  function aplicar(r: { p: PartituraE; sel: Sel; erro?: string }, som?: Pitch[]) {
    parar()
    if (r.erro) { setErro(r.erro); return }
    setErro(null)
    if (r.p !== p) setP(r.p)
    setSel(r.sel)
    if (r.sel.idx !== sel.idx || r.sel.compasso !== sel.compasso) setEditando(false)
    if (som?.length) tocarNota(som.map(toneNameP), '4n', undefined, 0.7)
    registrar('escritor', { feito: true })
  }

  // ── entrada de notas
  function inserirAltura(altura: Pitch, s: Sel = sel) {
    const sel2 = { ...s }
    if (acorde) {
      const atual = notaEm(p, sel2)
      if (atual && !atual.rest) {
        if (atual.alturas.some((a) => a.d === altura.d)) return setErro('Essa nota já está no acorde.')
        return aplicar(alterar(p, sel2, (x) => ({ ...x, alturas: [...x.alturas, altura] })), [...atual.alturas, altura])
      }
    }
    const nota: NotaE = { id: novoId(), dur, dots: ponto ? 1 : 0, rest: false, alturas: [altura] }
    aplicar(inserir(p, sel2, nota), [altura])
  }

  function inserirPausa() {
    aplicar(inserir(p, sel, { id: novoId(), dur, dots: ponto ? 1 : 0, rest: true, alturas: [] }))
  }

  function porLetra(g: number) {
    const ref = alturaReferencia(p, sel)
    inserirAltura(comArmadura(arm, letraProxima(g, ref)))
  }

  // ── alterações na nota selecionada
  const selecionada = notaEm(p, sel)
  function mudarDuracao(d: Dur) {
    setDur(d)
    if (selecionada && editando) aplicar(alterar(p, sel, (x) => ({ ...x, dur: d, dots: d === '16' ? 0 : x.dots })))
  }
  function alternarPonto() {
    const novo = !ponto
    setPonto(novo)
    if (selecionada && editando) aplicar(alterar(p, sel, (x) => ({ ...x, dots: x.dots ? 0 : 1 })))
  }
  function acidente(a: Acc) {
    if (!selecionada || selecionada.rest) return setErro('Selecione uma nota para colocar o acidente.')
    const topo = selecionada.alturas.length - 1
    aplicar(alterar(p, sel, (x) => ({ ...x, alturas: x.alturas.map((h, i) => (i === topo ? { ...h, acc: h.acc === a && a !== 0 ? 0 : a } : h)) })), [{ ...selecionada.alturas[topo], acc: a }])
  }
  function alternarLiga() {
    if (!selecionada || selecionada.rest) return setErro('Selecione uma nota para ligar à próxima.')
    aplicar(alterar(p, sel, (x) => ({ ...x, liga: !x.liga })))
  }
  function moverAltura(passos: number, oitava = false) {
    if (!selecionada || selecionada.rest) return
    const novas = selecionada.alturas.map((h) => transpor(h, passos, arm, oitava))
    aplicar(alterar(p, sel, (x) => ({ ...x, alturas: novas })), novas)
  }
  /** com uma nota escolhida para edição, troca nota ↔ pausa; senão, escreve uma pausa */
  function paraPausaOuNota() {
    if (!selecionada || !editando) return inserirPausa()
    aplicar(alterar(p, sel, (x) => (x.rest ? { ...x, rest: false, alturas: [comArmadura(arm, alturaReferencia(p, sel))] } : { ...x, rest: true, alturas: [], liga: false })))
  }

  function voltar() {
    const ant = desfazer.current.pop()
    if (!ant) return
    refazer.current.push(p)
    setPState(ant)
    setSel((s) => ({ ...s, idx: Math.min(s.idx, (ant.pautas[s.pauta]?.compassos[s.compasso]?.length ?? 0) - 1), compasso: Math.min(s.compasso, totalCompassos(ant) - 1) }))
  }
  function avancar() {
    const prox = refazer.current.pop()
    if (!prox) return
    desfazer.current.push(p)
    setPState(prox)
  }

  // ── reprodução
  function parar() {
    cancelAnimationFrame(raf.current)
    pararSom()
    setEstado('parado')
    setTocando(new Set())
    setMarksTocando({})
  }

  async function tocarPartitura() {
    await initAudio()
    parar()
    const { notas, inicioNota, duracao } = paraSom(p)
    const desde = doInicio ? 0 : sel.compasso * cap
    const sons = notas.filter((x) => x.t >= desde - 1e-9).map((x) => ({ ...x, t: x.t - desde }))
    const nComp = totalCompassos(p) - Math.round(desde / cap)
    const ag = await tocarSequencia(sons, { compasso: c, bpm: bpm / valorPulso(c), metronomo, contagem, compassos: nComp })
    setEstado('tocando')
    let chave = ''
    const loop = () => {
      const b = desde + (agora() - ag.inicio) / ag.spq
      if (b >= desde) {
        const ids = new Set<string>()
        const marks: Record<number, Marca> = {}
        for (const ev of notas) if (ev.t <= b && b < ev.t + ev.dur) { ev.midi.forEach((m) => (marks[m] = 'dica')); ev.ids.forEach((id) => { const r = inicioNota.get(id); if (r && r.t <= b && b < r.t + r.dur) ids.add(id) }) }
        const k = [...ids].join()
        if (k !== chave) { chave = k; setTocando(ids); setMarksTocando(marks) }
      }
      if (b > duracao + 0.2) { parar(); return }
      raf.current = requestAnimationFrame(loop)
    }
    loop()
  }
  useEffect(() => () => { cancelAnimationFrame(raf.current); pararSom() }, [])

  // ── atalhos de teclado
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(alvo?.tagName)) return
      const k = e.key
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && k.toLowerCase() === 'z') { e.preventDefault(); return e.shiftKey ? avancar() : voltar() }
      if (ctrl && k.toLowerCase() === 'y') { e.preventDefault(); return avancar() }
      if (k === ' ') { e.preventDefault(); return estado === 'tocando' ? parar() : tocarPartitura() }
      if (ctrl) {
        if (k === 'ArrowUp') { e.preventDefault(); return moverAltura(1, true) }
        if (k === 'ArrowDown') { e.preventDefault(); return moverAltura(-1, true) }
        return
      }
      const letra = 'cdefgab'.indexOf(k.toLowerCase())
      if (letra >= 0 && k.length === 1) { e.preventDefault(); return porLetra(letra) }
      const d = DURACOES.find((x) => x.tecla === k)
      if (d) return mudarDuracao(d.dur)
      if (k === '.') return alternarPonto()
      if (k === '0') return paraPausaOuNota()
      if (k === '+') return acidente(1)
      if (k === '-') return acidente(-1)
      if (k === '=') return acidente(0)
      if (k.toLowerCase() === 't') return alternarLiga()
      if (k.toLowerCase() === 'k') return setAcorde((x) => !x)
      if (k === 'ArrowRight') { e.preventDefault(); setEditando(true); return setSel(mover(p, sel, 1)) }
      if (k === 'ArrowLeft') { e.preventDefault(); setEditando(true); return setSel(mover(p, sel, -1)) }
      if (k === 'ArrowUp') { e.preventDefault(); return moverAltura(1) }
      if (k === 'ArrowDown') { e.preventDefault(); return moverAltura(-1) }
      if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); return aplicar(remover(p, sel)) }
      if (k === 'Tab' && p.pautas.length > 1) { e.preventDefault(); return setSel({ pauta: (sel.pauta + 1) % p.pautas.length, compasso: sel.compasso, idx: (p.pautas[(sel.pauta + 1) % p.pautas.length].compassos[sel.compasso]?.length ?? 0) - 1 }) }
      if (k === 'Escape') return setErro(null)
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })

  // ── gerenciar partituras
  function abrir(q: PartituraE) {
    parar()
    desfazer.current = []
    refazer.current = []
    setPState(q)
    setBpm(q.bpm)
    setSel({ pauta: 0, compasso: 0, idx: -1 })
    setErro(null)
  }
  function exportar() {
    const blob = new Blob([exportarMusicXML(p)], { type: 'application/vnd.recordare.musicxml+xml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${p.titulo.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'partitura'}.musicxml`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  // ── informações do compasso atual
  const compAtual = p.pautas[sel.pauta]?.compassos[sel.compasso] ?? []
  const usado = soma(compAtual)
  const incompletos = Array.from({ length: totalCompassos(p) }, (_, i) => i).filter((i) => i < totalCompassos(p) - 1 && p.pautas.some((pt) => { const s = soma(pt.compassos[i] ?? []); return s > 0 && s < cap - 1e-9 }))
  const marcasSel: Record<number, Marca> = {}
  selecionada?.alturas.forEach((a) => (marcasSel[midiP(a)] = 'ok'))
  const pautaAtiva = p.pautas[sel.pauta]
  const pianoDe = pautaAtiva?.clef === 'bass' ? 36 : 55
  const pianoAte = pautaAtiva?.clef === 'bass' ? 67 : 88

  return (
    <div className="escritor">
      <section className="painel barra-arquivo">
        <div className="toolbar esquerda">
          <input id="titulo-partitura" className="titulo-input" value={p.titulo} onChange={(e) => setP({ ...p, titulo: e.target.value }, false)} aria-label="Título da partitura" />
          <label className="ctl">
            <span>Minhas partituras</span>
            <select id="lista-partituras" value={p.id} onChange={(e) => { const q = lista.find((x) => x.id === e.target.value); if (q) abrir(q) }}>
              {!lista.some((x) => x.id === p.id) && <option value={p.id}>{p.titulo}</option>}
              {lista.map((x) => <option key={x.id} value={x.id}>{x.titulo}</option>)}
            </select>
          </label>
          <button className="btn small" onClick={() => setCriando((x) => !x)}>+ Nova</button>
          <button className="btn small" onClick={() => abrir(exemploOde())}>Exemplo</button>
          <button className="btn small" onClick={exportar} title="Abre no MuseScore, Finale, Sibelius…">Exportar MusicXML</button>
          <button className="btn small perigo" onClick={() => { apagarPartitura(p.id); const l = listarPartituras(); setLista(l); abrir(l[0] ?? exemploOde()) }}>Apagar</button>
        </div>
        {criando && <NovaPartitura onCriar={(q) => { abrir(q); salvarPartitura(q); setLista(listarPartituras()); setCriando(false) }} onCancelar={() => setCriando(false)} />}
        <div className="muted small">
          {p.compasso} · {arm.qtd ? `${arm.maior} (${arm.qtd} ${arm.tipo === 1 ? '♯' : '♭'})` : 'Dó maior'} · {p.pautas.map((x) => x.nome).join(' + ')} · {totalCompassos(p)} compassos · salvo automaticamente neste aparelho
        </div>
      </section>

      <section className="painel paleta-editor" aria-label="Ferramentas de escrita">
        <div className="grupo">
          {DURACOES.map((x) => (
            <button key={x.dur} className={'fig-btn' + (dur === x.dur ? ' on' : '')} onClick={() => mudarDuracao(x.dur)} title={`${nomeFigura({ dur: x.dur })} (tecla ${x.tecla})`} aria-pressed={dur === x.dur}>
              <Staff clef={null} measures={[[{ keys: ['c/5'], dur: x.dur }]]} width={60} height={80} y={-5} />
              <small>{x.tecla}</small>
            </button>
          ))}
          <button className={'fer-btn' + (ponto ? ' on' : '')} onClick={alternarPonto} title="Ponto de aumento (tecla .)" aria-pressed={ponto}>ponto<small>.</small></button>
          <button className="fer-btn" onClick={paraPausaOuNota} title="Escrever pausa (tecla 0). Com uma nota escolhida, troca nota por pausa">pausa<small>0</small></button>
        </div>
        <div className="grupo">
          <button className="fer-btn" onClick={() => acidente(1)} title="Sustenido (tecla +)">♯<small>+</small></button>
          <button className="fer-btn" onClick={() => acidente(-1)} title="Bemol (tecla -)">♭<small>−</small></button>
          <button className="fer-btn" onClick={() => acidente(0)} title="Bequadro (tecla =)">♮<small>=</small></button>
          <button className={'fer-btn' + (selecionada?.liga ? ' on' : '')} onClick={alternarLiga} title="Ligadura de valor com a próxima nota (tecla T)">ligar<small>T</small></button>
          <button className={'fer-btn' + (acorde ? ' on' : '')} onClick={() => setAcorde((x) => !x)} title="Modo acorde: novas notas entram na nota selecionada (tecla K)" aria-pressed={acorde}>acorde<small>K</small></button>
          <button className="fer-btn" onClick={() => aplicar(remover(p, sel))} title="Apagar a nota selecionada (Backspace)">apagar<small>⌫</small></button>
          <button className="fer-btn" onClick={voltar} disabled={!desfazer.current.length} title="Desfazer (Ctrl+Z)">desfazer</button>
          <button className="fer-btn" onClick={avancar} disabled={!refazer.current.length} title="Refazer (Ctrl+Y)">refazer</button>
        </div>
        <div className="grupo">
          <button className="fer-btn" onClick={() => aplicar({ p: adicionarCompasso(p, sel.compasso), sel: { ...sel, compasso: sel.compasso + 1, idx: -1 } })}>+ compasso</button>
          <button className="fer-btn" onClick={() => aplicar({ p: removerCompasso(p, sel.compasso), sel: { ...sel, compasso: Math.max(0, Math.min(sel.compasso, totalCompassos(p) - 2)), idx: -1 } })}>− compasso</button>
          {p.pautas.length > 1 && (
            <div className="seg" role="group" aria-label="Pauta ativa">
              {p.pautas.map((pt, i) => <button key={i} className={sel.pauta === i ? 'on' : ''} onClick={() => setSel({ pauta: i, compasso: sel.compasso, idx: (pt.compassos[sel.compasso]?.length ?? 0) - 1 })}>{pt.nome}</button>)}
            </div>
          )}
        </div>
      </section>

      <div className="status-editor small" aria-live="polite">
        <span>
          Compasso <b>{sel.compasso + 1}</b> ({pautaAtiva?.nome}): <b className="tabular">{fmtDuracao(usado, c)}</b> de {fmtDuracao(cap, c)}
          {usado >= cap - 1e-9 ? ' · completo' : ` · faltam ${fmtDuracao(cap - usado, c)}`}
        </span>
        <span> · {editando && selecionada ? 'A paleta edita a nota selecionada' : `Próxima nota: ${nomeFigura({ dur, dots: ponto ? 1 : 0 })}`}</span>
        {selecionada && <span> · Selecionada: <b>{selecionada.rest ? nomeFigura({ dur: selecionada.dur, dots: selecionada.dots, rest: true }) : `${selecionada.alturas.map(nomeAltura).join(' + ')} (${nomeFigura({ dur: selecionada.dur, dots: selecionada.dots })})`}</b>{selecionada.liga ? ' · ligada' : ''}</span>}
        {incompletos.length > 0 && <span className="warn"> · Compassos incompletos: {incompletos.map((i) => i + 1).join(', ')}</span>}
      </div>
      {erro && <div className="aviso-req" role="alert">{erro}</div>}

      <div className="staff-box folha-editor">
        <EditorPauta
          p={p}
          sel={sel}
          tocando={tocando}
          onSelecionar={(s) => { setErro(null); setSel(s); setEditando(true); const x = notaEm(p, s); if (x && !x.rest) tocarNota(x.alturas.map(toneNameP), '8n', undefined, 0.6) }}
          onClicarPosicao={(s, d) => {
            setSel(s)
            const atual = acorde ? notaEm(p, sel) : undefined
            if (acorde && atual && sel.pauta === s.pauta) inserirAltura(comArmadura(arm, d), sel)
            else inserirAltura(comArmadura(arm, d), s)
          }}
        />
      </div>
      <p className="muted small center">
        Clique no pentagrama para escrever na altura do clique, clique numa nota para selecioná-la, ou use as letras C D E F G A B. Setas ↑↓ mudam a altura (Ctrl: oitava), ←→ movem a seleção. Espaço toca.
      </p>

      <section className="painel controles-escritor">
        <div className="toolbar esquerda">
          {estado === 'tocando'
            ? <button className="btn primary" onClick={parar}>■ Parar</button>
            : <button className="btn primary" onClick={tocarPartitura}>▶ Tocar</button>}
          <div className="seg">
            <button className={doInicio ? 'on' : ''} onClick={() => setDoInicio(true)}>Do início</button>
            <button className={!doInicio ? 'on' : ''} onClick={() => setDoInicio(false)}>Do compasso {sel.compasso + 1}</button>
          </div>
          <label className="ctl bpm">
            <span>Andamento ♩ =</span>
            <input id="bpm-escritor" type="number" min={30} max={220} value={bpm} className="num" onChange={(e) => { const v = Math.max(30, Math.min(220, Number(e.target.value) || 30)); setBpm(v); setP({ ...p, bpm: v }, false) }} />
            <input type="range" min={30} max={220} value={bpm} onChange={(e) => { const v = Number(e.target.value); setBpm(v); setP({ ...p, bpm: v }, false) }} aria-label="Andamento" />
          </label>
          <label className="check"><input type="checkbox" checked={metronomo} onChange={(e) => setMetronomo(e.target.checked)} /> Metrônomo</label>
          <label className="check"><input type="checkbox" checked={contagem} onChange={(e) => setContagem(e.target.checked)} /> Contagem</label>
        </div>
      </section>

      <div className="piano-fixo compacto">
        <div className="muted small center">Piano: clique numa tecla para escrever a nota na pauta “{pautaAtiva?.nome}”{acorde ? ' (modo acorde: entra na nota selecionada)' : ''}.</div>
        <Piano from={pianoDe} to={pianoAte} computerKeys={false} labels={false} sound={false}
          marks={estado === 'tocando' ? marksTocando : marcasSel}
          onNote={(m) => inserirAltura(grafarMidi(m, arm))} />
      </div>
    </div>
  )
}

function NovaPartitura({ onCriar, onCancelar }: { onCriar: (p: PartituraE) => void; onCancelar: () => void }) {
  const [titulo, setTitulo] = useState('Minha música')
  const [formato, setFormato] = useState<FormatoPautas>('piano')
  const [c, setC] = useState<Compasso>(compassoPorId('4/4'))
  const [arm, setArm] = useState('C')
  const [bpm, setBpm] = useState(90)
  const [n, setN] = useState(8)
  return (
    <form className="nova-partitura" onSubmit={(e) => { e.preventDefault(); onCriar(novaPartitura({ titulo, compasso: c.id, armadura: arm, bpm, formato, compassos: n })) }}>
      <label className="ctl"><span>Título</span><input id="nova-titulo" className="busca" value={titulo} onChange={(e) => setTitulo(e.target.value)} /></label>
      <label className="ctl"><span>Pautas</span>
        <select id="nova-formato" value={formato} onChange={(e) => setFormato(e.target.value as FormatoPautas)}>
          <option value="piano">Piano (Sol + Fá)</option>
          <option value="sol">Só clave de Sol</option>
          <option value="fa">Só clave de Fá</option>
        </select>
      </label>
      <SeletorCompasso valor={c} onChange={setC} />
      <label className="ctl"><span>Tonalidade</span>
        <select id="nova-armadura" value={arm} onChange={(e) => setArm(e.target.value)}>
          {ARMADURAS.filter((a) => a.qtd <= 5).map((a) => <option key={a.vex} value={a.vex}>{a.maior}{a.qtd ? ` (${a.qtd}${a.tipo === 1 ? '♯' : '♭'})` : ''}</option>)}
        </select>
      </label>
      <label className="ctl"><span>Andamento</span><input id="nova-bpm" type="number" className="num" min={30} max={220} value={bpm} onChange={(e) => setBpm(Number(e.target.value) || 90)} /></label>
      <label className="ctl"><span>Compassos</span><input id="nova-n" type="number" className="num" min={1} max={64} value={n} onChange={(e) => setN(Math.max(1, Math.min(64, Number(e.target.value) || 4)))} /></label>
      <div className="row">
        <button className="btn primary small" type="submit">Criar</button>
        <button className="btn small" type="button" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  )
}
