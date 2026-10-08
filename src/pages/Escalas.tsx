// Módulo de escalas: lições (maior, menores, pentatônicas/blues, jazz) com explorador interativo,
// treino de identificação (pela partitura e pelo ouvido) e construção da escala no piano.
import { useEffect, useMemo, useState } from 'react'
import Staff, { type SNote } from '../components/Staff'
import Piano, { type Marca } from '../components/Piano'
import Niveis from '../components/Niveis'
import MultipleChoice, { type Pergunta } from '../components/MultipleChoice'
import { useNivel } from '../hooks/useNivel'
import { tocarSequencia, type NotaTocada } from '../music/player'
import { midiP, n, nomeP, nomesMidi, P, rand, shuffle, VEX_ACC, vexKeyP, type Pitch } from '../music/notes'
import {
  construir, escala, ESCALAS, NOMES_FAMILIA, nomeTonica, passos, rotulosGraus, somEscala, titulo, tonicasPara, TONICAS,
  type Escala,
} from '../music/escalas'
import { registrar } from '../store'

const BPM = 100

function Concluir({ id }: { id: string }) {
  useEffect(() => {
    registrar(id, { feito: true })
  }, [id])
  return null
}

/** notas da escala para o pentagrama (com acidentes e rótulos opcionais) */
function notasStaff(e: Escala, ps: Pitch[], rotulos: 'nomes' | 'graus' | 'ambos' | 'nenhum' = 'ambos', cor?: (i: number) => string | undefined): SNote[] {
  const graus = [...rotulosGraus(e), '8']
  return ps.map((p, i) => ({
    keys: [vexKeyP(p)],
    dur: 'q',
    acc: p.acc ? VEX_ACC[p.acc] : undefined,
    color: cor?.(i),
    label: rotulos === 'nomes' || rotulos === 'ambos' ? nomeP(p) : undefined,
    labelTop: rotulos === 'graus' || rotulos === 'ambos' ? graus[i % graus.length] : undefined,
  }))
}

const tocarEscala = (ps: Pitch[], descer = false) => tocarSequencia(somEscala(ps, descer), { bpm: BPM })

/** fileira com os passos (T, S, 1½T) entre as notas */
function Passos({ e, atual }: { e: Escala; atual?: number }) {
  return (
    <div className="passos" aria-label="Fórmula de tons e semitons">
      {passos(e).map((p, i) => (
        <span key={i} className={'passo' + (p === 'S' ? ' s' : p.includes('½') || p.includes('2') ? ' grande' : '') + (atual === i ? ' atual' : '')}>{p}</span>
      ))}
    </div>
  )
}

/** fileira com os graus (1 2 ♭3 …), destacando os alterados em relação à escala maior */
function Graus({ e }: { e: Escala }) {
  return (
    <div className="graus" aria-label="Graus da escala">
      {rotulosGraus(e).map((g, i) => <span key={i} className={'grau' + (/[♭♯]/.test(g) ? ' alt' : '')}>{g}</span>)}
    </div>
  )
}

/** exemplo fixo de escala numa lição */
function ExemploEscala({ id, tonica, legenda, rotulos = 'ambos' }: { id: string; tonica?: string; legenda?: string; rotulos?: 'nomes' | 'graus' | 'ambos' }) {
  const e = escala(id)
  const t = tonica ? TONICAS.find((x) => nomeTonica(x) === tonica) ?? P(n(e.tonicaPadrao)) : P(n(e.tonicaPadrao))
  const ps = construir(e, t)
  return (
    <figure className="exemplo">
      <div className="staff-box">
        <Staff clef="treble" time={null} measures={[notasStaff(e, ps, rotulos)]} width={Math.max(420, ps.length * 62)} height={150} y={20} />
      </div>
      <Passos e={e} />
      <figcaption>
        <button className="btn small" onClick={() => tocarEscala(ps)}>▶ Ouvir</button>
        <button className="btn small" onClick={() => tocarEscala(ps, true)}>▶ Subir e descer</button>
        <span>{legenda ?? titulo(e, t)}</span>
      </figcaption>
    </figure>
  )
}

// ───────────────────────── Explorador ─────────────────────────
/** escolha a escala e a tônica: vê no pentagrama, no piano, a fórmula e os graus, e ouve */
export function ExploradorEscala({ ids, inicial }: { ids: string[]; inicial?: string }) {
  const [id, setId] = useState(inicial ?? ids[0])
  const e = escala(id)
  const opcoes = tonicasPara(e)
  const [tn, setTn] = useState(nomeTonica(P(n(e.tonicaPadrao))))
  const t = opcoes.find((x) => nomeTonica(x) === tn) ?? P(n(e.tonicaPadrao))
  const ps = construir(e, t)
  const marks: Record<number, Marca> = {}
  ps.forEach((p, i) => { marks[midiP(p)] = i === 0 || i === ps.length - 1 ? 'ok' : 'dica' })
  const alteradas = ps.slice(0, -1).filter((p) => p.acc !== 0).map(nomeP)

  return (
    <section className="explorador">
      <h3>Explore: construa em outra tônica</h3>
      <div className="toolbar">
        {ids.length > 1 && (
          <label>Escala{' '}
            <select value={id} onChange={(ev) => setId(ev.target.value)}>
              {ids.map((x) => <option key={x} value={x}>{escala(x).nome}</option>)}
            </select>
          </label>
        )}
        <label>Tônica{' '}
          <select value={nomeTonica(t)} onChange={(ev) => setTn(ev.target.value)}>
            {opcoes.map((x) => <option key={nomeTonica(x)} value={nomeTonica(x)}>{nomeTonica(x)}</option>)}
          </select>
        </label>
        <button className="btn small" onClick={() => tocarEscala(ps)}>▶ Subir</button>
        <button className="btn small" onClick={() => tocarEscala(ps, true)}>▶ Subir e descer</button>
      </div>
      <h4 className="center">{titulo(e, t)}</h4>
      <div className="staff-box">
        <Staff clef="treble" time={null} measures={[notasStaff(e, ps)]} width={Math.max(420, ps.length * 62)} height={150} y={20} />
      </div>
      <Passos e={e} />
      <Graus e={e} />
      <p className="muted small center">
        {alteradas.length ? `Notas alteradas: ${alteradas.join(', ')}.` : 'Sem acidentes.'} {e.caracter}
      </p>
      <Piano from={60} to={84} marks={marks} labels />
    </section>
  )
}

// ───────────────────────── Lições ─────────────────────────
export function LicaoEscalasMaior() {
  return (
    <article className="lesson">
      <Concluir id="licao-escalas-maior" />
      <h2>O que é uma escala</h2>
      <p>Uma <b>escala</b> é uma sequência de notas em ordem, da <b>tônica</b> (a nota que dá nome à escala) até a mesma nota uma <b>oitava</b> acima. O que define o tipo da escala não são as notas em si, mas as <b>distâncias</b> entre elas.</p>

      <h2>Tom e semitom</h2>
      <p>No piano, o <b>semitom (S)</b> é a menor distância: de uma tecla para a vizinha, contando as pretas. O <b>tom (T)</b> vale dois semitons (pula uma tecla).</p>
      <p className="dica">Entre as teclas brancas há dois semitons "naturais", onde não existe tecla preta no meio: <b>Mi–Fá</b> e <b>Si–Dó</b>. Todas as outras brancas vizinhas estão a um tom.</p>

      <h2>A fórmula da escala maior</h2>
      <p>Toda escala maior segue a mesma receita: <b>T T S T T T S</b>. Os semitons ficam entre o <b>3º e o 4º grau</b> e entre o <b>7º grau e a oitava</b>. Começando no Dó, a receita cai exatamente nas teclas brancas:</p>
      <ExemploEscala id="maior" tonica="Dó" />

      <h2>Construindo em outra tônica</h2>
      <p>Para fazer a escala maior de <b>Sol</b>, aplique a receita a partir do Sol: Sol →T Lá →T Si →S Dó →T Ré →T Mi →<b>T</b> ? Do Mi, um tom acima não é Fá (Mi–Fá é semitom), e sim <b>Fá♯</b>. Depois, Fá♯ →S Sol. Pronto: Sol maior tem <b>um sustenido</b>.</p>
      <ExemploEscala id="maior" tonica="Sol" />
      <p>Em <b>Ré</b> a receita pede <b>Fá♯ e Dó♯</b>. Em <b>Fá</b>, do Lá ao próximo grau é preciso só um semitom: a nota é <b>Si♭</b>.</p>
      <ExemploEscala id="maior" tonica="Ré" />
      <ExemploEscala id="maior" tonica="Fá" />

      <h2>Uma letra para cada nota</h2>
      <p>Na escrita, a escala usa <b>todas as sete letras em ordem</b>, sem repetir nem pular nenhuma. Por isso, em Fá maior escrevemos <b>Si♭</b> e não Lá♯: Lá♯ repetiria a letra Lá e pularia o Si. É essa regra que faz uma escala ter só sustenidos ou só bemóis.</p>
      <p className="dica">Os acidentes de cada escala maior são exatamente a <b>armadura de clave</b> da tonalidade. Sol maior → 1♯ (Fá♯); Ré maior → 2♯; Fá maior → 1♭ (Si♭).</p>

      <ExploradorEscala ids={['maior']} />
    </article>
  )
}

export function LicaoEscalasMenor() {
  return (
    <article className="lesson">
      <Concluir id="licao-escalas-menor" />
      <h2>Menor natural</h2>
      <p>A escala menor natural tem a fórmula <b>T S T T S T T</b>. Comparada com a maior de mesma tônica, ela tem a <b>3ª, a 6ª e a 7ª um semitom abaixo</b> (♭3, ♭6, ♭7). É a 3ª menor que dá o som mais triste.</p>
      <ExemploEscala id="menor-natural" tonica="Lá" />
      <p className="dica"><b>Relativas:</b> Lá menor usa as mesmas notas de Dó maior, só que começando no Lá (o 6º grau de Dó). Para achar a relativa menor de qualquer maior, desça <b>1½ tom</b> da tônica: Sol maior → Mi menor; Fá maior → Ré menor. As duas têm a mesma armadura.</p>
      <ExemploEscala id="menor-natural" tonica="Dó" legenda="Dó menor natural: Mi♭, Lá♭ e Si♭ (♭3, ♭6, ♭7)" />

      <h2>Menor harmônica</h2>
      <p>Na menor natural, o 7º grau fica a um tom da tônica e a melodia "não pede" para voltar à tônica. Elevando a 7ª um semitom, ela vira <b>sensível</b> (a um semitom da tônica). Em Lá menor, Sol vira <b>Sol♯</b>. Entre a 6ª e a 7ª surge um salto de <b>1½ tom</b>, que dá o sabor dramático.</p>
      <ExemploEscala id="menor-harmonica" tonica="Lá" />

      <h2>Menor melódica</h2>
      <p>Para suavizar esse salto, a menor melódica eleva também a <b>6ª</b>: <b>T S T T T T S</b>. É menor no começo (♭3) e igual à maior no final. Na tradição clássica, ela volta à menor natural ao descer; no jazz é tocada igual nos dois sentidos.</p>
      <ExemploEscala id="menor-melodica" tonica="Lá" />
      <p className="dica">Resumo em Lá: natural = Sol e Fá naturais · harmônica = Sol♯ · melódica = Fá♯ e Sol♯. Os acidentes da harmônica e da melódica <b>não</b> vão na armadura; são escritos ao lado das notas.</p>

      <ExploradorEscala ids={['menor-natural', 'menor-harmonica', 'menor-melodica']} />
    </article>
  )
}

export function LicaoEscalasBlues() {
  return (
    <article className="lesson">
      <Concluir id="licao-escalas-blues" />
      <h2>Pentatônicas: cinco notas</h2>
      <p>"Penta" quer dizer cinco. A <b>pentatônica maior</b> é a escala maior sem o 4º e o 7º grau: <b>1 2 3 5 6</b>. Sem semitons, quase nada soa "errado" — é a escala mais fácil para improvisar.</p>
      <ExemploEscala id="pentatonica-maior" tonica="Dó" />
      <p className="dica">Curiosidade: as cinco teclas pretas do piano formam a pentatônica maior de Fá♯ (Fá♯ Sol♯ Lá♯ Dó♯ Ré♯).</p>
      <p>A <b>pentatônica menor</b> é a menor natural sem o 2º e o 6º grau: <b>1 ♭3 4 5 ♭7</b>. Lá pentatônica menor tem as mesmas notas de Dó pentatônica maior (são relativas, como as escalas maior e menor).</p>
      <ExemploEscala id="pentatonica-menor" tonica="Lá" />

      <h2>A escala blues e a blue note</h2>
      <p>Acrescentando à pentatônica menor a <b>♭5</b> (a "blue note", entre o 4º e o 5º grau), temos a <b>escala blues</b>: <b>1 ♭3 4 ♭5 5 ♭7</b>. A ♭5 é uma nota de passagem tensa, que "arrasta" até a 5ª — é o som característico do blues e do rock.</p>
      <ExemploEscala id="blues" tonica="Lá" />
      <p className="dica">Como a 4ª e a ♭5 usam letras próximas, a blue note costuma ser escrita como ♭5 (Mi♭ em Lá) ao descer e às vezes como ♯4 (Ré♯) ao subir. Aqui usamos ♭5.</p>

      <h2>Blues maior</h2>
      <p>O <b>blues maior</b> é a pentatônica maior com a <b>♭3</b> de passagem: <b>1 2 ♭3 3 5 6</b>. A ♭3 resolve na 3ª maior, criando aquele "choro" alegre do country, do gospel e do rock'n'roll.</p>
      <ExemploEscala id="blues-maior" tonica="Dó" />

      <ExploradorEscala ids={['pentatonica-maior', 'pentatonica-menor', 'blues', 'blues-maior']} />
    </article>
  )
}

/** ii–V–I em Dó: Dm7 – G7 – Cmaj7 */
const II_V_I: NotaTocada[] = [
  { t: 0, dur: 1.9, notas: ['D3', 'F3', 'A3', 'C4'] },
  { t: 2, dur: 1.9, notas: ['G2', 'F3', 'B3', 'D4'] },
  { t: 4, dur: 3.8, notas: ['C3', 'E3', 'G3', 'B3'] },
]

export function LicaoEscalasJazz() {
  return (
    <article className="lesson">
      <Concluir id="licao-escalas-jazz" />
      <h2>Modos: a mesma escala, outro centro</h2>
      <p>Se tocarmos as notas de Dó maior começando em outro grau, obtemos os <b>modos</b>. Cada modo tem uma fórmula própria, porque os dois semitons (Mi–Fá e Si–Dó) caem em lugares diferentes.</p>
      <div className="tabela-scroll"><table className="tabela">
        <thead><tr><th>Grau</th><th>Modo</th><th>Teclas brancas</th><th>Diferença para a maior</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Jônio (= maior)</td><td>Dó–Dó</td><td>—</td></tr>
          <tr><td>2</td><td><b>Dórico</b></td><td>Ré–Ré</td><td>♭3, ♭7</td></tr>
          <tr><td>3</td><td>Frígio</td><td>Mi–Mi</td><td>♭2, ♭3, ♭6, ♭7</td></tr>
          <tr><td>4</td><td><b>Lídio</b></td><td>Fá–Fá</td><td>♯4</td></tr>
          <tr><td>5</td><td><b>Mixolídio</b></td><td>Sol–Sol</td><td>♭7</td></tr>
          <tr><td>6</td><td>Eólio (= menor natural)</td><td>Lá–Lá</td><td>♭3, ♭6, ♭7</td></tr>
          <tr><td>7</td><td>Lócrio</td><td>Si–Si</td><td>♭2, ♭3, ♭5, ♭6, ♭7</td></tr>
        </tbody>
      </table></div>
      <p>No jazz, os mais usados são o <b>dórico</b>, o <b>mixolídio</b> e o <b>lídio</b>. Para construí-los em qualquer tônica, pense na maior de mesma tônica e altere os graus da tabela.</p>
      <ExemploEscala id="dorico" tonica="Ré" />
      <ExemploEscala id="mixolidio" tonica="Sol" />
      <ExemploEscala id="lidio" tonica="Fá" />

      <h2>Escalas e acordes: o ii–V–I</h2>
      <p>A progressão mais comum do jazz é o <b>ii–V–I</b>. Em Dó: <b>Dm7 – G7 – Cmaj7</b>. Sobre cada acorde se usa um modo: <b>Ré dórico</b> no Dm7, <b>Sol mixolídio</b> no G7 e <b>Dó maior</b> (ou lídio) no Cmaj7 — todas com as mesmas notas, mas cada uma "centrada" na nota do acorde.</p>
      <figure className="exemplo">
        <figcaption>
          <button className="btn small" onClick={() => tocarSequencia(II_V_I, { bpm: 80 })}>▶ Ouvir ii–V–I em Dó</button>
          <span>Dm7 → G7 → Cmaj7</span>
        </figcaption>
      </figure>

      <h2>Menor melódica, bebop e tons inteiros</h2>
      <p>A <b>menor melódica</b> (T S T T T T S, igual subindo e descendo) é a base de muitos sons modernos do jazz. A <b>escala bebop dominante</b> é o mixolídio com uma nota de passagem cromática entre a ♭7 e a 7: com <b>8 notas</b>, as notas do acorde caem sempre nos tempos fortes.</p>
      <ExemploEscala id="bebop" tonica="Sol" />
      <p>A escala de <b>tons inteiros</b> tem seis notas, todas separadas por um tom. Sem semitons, não tem uma tônica clara e soa como um sonho — muito usada por Debussy e Thelonious Monk.</p>
      <ExemploEscala id="tons-inteiros" tonica="Dó" />

      <ExploradorEscala ids={['dorico', 'mixolidio', 'lidio', 'menor-melodica', 'bebop', 'tons-inteiros']} />
    </article>
  )
}

// ───────────────────────── Treino: identificar ─────────────────────────
export const NIVEIS_IDENTIFICAR = ['Maior ou menor natural', 'As três menores', 'Pentatônicas e blues', 'Modos de jazz', 'Pelo ouvido (todas)']
const POOL_ID: string[][] = [
  ['maior', 'menor-natural'],
  ['maior', 'menor-natural', 'menor-harmonica', 'menor-melodica'],
  ['pentatonica-maior', 'pentatonica-menor', 'blues', 'blues-maior'],
  ['dorico', 'mixolidio', 'lidio', 'bebop', 'tons-inteiros', 'maior', 'menor-natural'],
  ESCALAS.map((e) => e.id),
]
const TONICAS_FACEIS = ['Dó', 'Sol', 'Ré', 'Lá', 'Mi', 'Fá']

function sortearTonica(e: Escala, facil: boolean): Pitch {
  const ops = tonicasPara(e).filter((t) => !facil || TONICAS_FACEIS.includes(nomeTonica(t)))
  return rand(ops.length ? ops : tonicasPara(e))
}

function gerarIdentificacao(nivel: number): Pergunta {
  const pool = POOL_ID[nivel - 1]
  const e = escala(rand(pool))
  const t = sortearTonica(e, nivel <= 2)
  const ps = construir(e, t)
  const descer = Math.random() < 0.5
  const audio = { notas: somEscala(ps, descer), opcoes: { bpm: BPM }, auto: nivel === 5, rotulo: 'Ouvir a escala' }
  const staff = { clef: 'treble' as const, time: null, measures: [notasStaff(e, ps, 'nenhum')], width: Math.max(420, ps.length * 62), height: 150, y: 20 }
  const depois = { ...staff, measures: [notasStaff(e, ps, 'ambos')] }
  const resumo = `${titulo(e, t)}: ${rotulosGraus(e).join(' ')}. ${e.explica}`

  // às vezes, pergunta a fórmula em vez do nome
  if (nivel <= 4 && Math.random() < 0.3) {
    const formula = (x: Escala) => passos(x).join(' ')
    const outras = shuffle(pool.filter((x) => x !== e.id).map(escala)).map(formula).filter((f, i, a) => f !== formula(e) && a.indexOf(f) === i)
    const opcoes = shuffle([formula(e), ...outras.slice(0, 3)])
    return {
      texto: `Qual é a fórmula de tons (T) e semitons (S) desta escala de ${titulo(e, t)}?`,
      staff, depois, audio: { ...audio, auto: false },
      opcoes, certa: opcoes.indexOf(formula(e)),
      explica: resumo, conceito: 'escalas',
    }
  }

  const candidatos = nivel === 5 ? [e.id, ...shuffle(pool.filter((x) => x !== e.id)).slice(0, 3)] : pool
  const opcoes = shuffle(candidatos.map((x) => escala(x).nome))
  return {
    texto: nivel === 5 ? 'Ouça: que escala é esta?' : 'Que escala é esta?',
    staff: nivel === 5 ? undefined : staff,
    depois,
    audio,
    opcoes,
    certa: opcoes.indexOf(e.nome),
    explica: resumo,
    conceito: 'escalas',
  }
}

export function IdentificarEscala() {
  return (
    <div>
      <p className="muted center">Observe os acidentes e as distâncias entre as notas (ou ouça). Dica: compare com a escala maior da mesma tônica.</p>
      <MultipleChoice skill="escalas-identificar" niveis={NIVEIS_IDENTIFICAR} gerar={gerarIdentificacao} />
    </div>
  )
}

// ───────────────────────── Treino: construir no piano ─────────────────────────
export const NIVEIS_CONSTRUIR = ['Maior em Dó, Sol, Fá e Ré', 'Maior em qualquer tônica', 'Menores (natural, harmônica, melódica)', 'Pentatônicas e blues', 'Modos de jazz', 'Subindo e descendo (misto)']
const POOL_CONSTRUIR: string[][] = [
  ['maior'], ['maior'], ['menor-natural', 'menor-harmonica', 'menor-melodica'],
  ['pentatonica-maior', 'pentatonica-menor', 'blues', 'blues-maior'], ['dorico', 'mixolidio', 'lidio', 'bebop', 'tons-inteiros'],
  ESCALAS.map((e) => e.id),
]
const PIANO_DE = 48
const PIANO_ATE = 84

interface Tarefa { e: Escala; t: Pitch; descer: boolean }
function gerarTarefa(nivel: number): Tarefa {
  const e = escala(rand(POOL_CONSTRUIR[nivel - 1]))
  const ops = nivel === 1 ? TONICAS.filter((x) => ['Dó', 'Sol', 'Fá', 'Ré'].includes(nomeTonica(x))) : tonicasPara(e)
  return { e, t: rand(ops), descer: nivel === 6 }
}

const nomeDist = (s: number) => (s === 1 ? 'um semitom' : s === 2 ? 'um tom' : s === 3 ? '1½ tom' : `${s} semitons`)

export function ConstruirEscalaPiano() {
  const lv = useNivel('escalas-piano', NIVEIS_CONSTRUIR.length, NIVEIS_CONSTRUIR)
  const [tf, setTf] = useState<Tarefa>(() => gerarTarefa(lv.nivel))
  const [oit, setOit] = useState<number | null>(null) // deslocamento em oitavas a partir da oitava 4
  const [pos, setPos] = useState(0)
  const [erros, setErros] = useState(0)
  const [errosAqui, setErrosAqui] = useState(0)
  const [msg, setMsg] = useState<{ tipo: 'erro' | 'ok' | 'muted'; texto: string } | null>(null)
  const [marks, setMarks] = useState<Record<number, Marca>>({})
  const [ajuda, setAjuda] = useState(false)

  const base = useMemo(() => construir(tf.e, tf.t), [tf])
  const seqBase = tf.descer ? [...base, ...base.slice(0, -1).reverse()] : base
  const desloc = oit ?? 0
  const seq = seqBase.map((p) => P(p.d + 7 * desloc, p.acc))
  const alvos = seq.map(midiP)
  const fim = pos >= seq.length

  function novo(nv = lv.nivel) {
    setTf(gerarTarefa(nv))
    setOit(null); setPos(0); setErros(0); setErrosAqui(0); setMsg(null); setMarks({})
  }

  function errar(m: number, texto: string) {
    setMarks({ [m]: 'erro' })
    setErros((x) => x + 1)
    setErrosAqui((x) => x + 1)
    setMsg({ tipo: 'erro', texto })
  }

  function onNote(m: number) {
    if (fim) return
    const tocada = nomesMidi(m)
    const nomeTocada = tocada.sust + (tocada.bem ? ` / ${tocada.bem}` : '')
    if (pos === 0) {
      const tonica = midiP(tf.t)
      if (((m - tonica) % 12 + 12) % 12 !== 0) return errar(m, `Você tocou ${nomeTocada}. Comece pela tônica: ${nomeTonica(tf.t)}.`)
      const o = (m - tonica) / 12
      const ms = seqBase.map((p) => midiP(p) + 12 * o)
      if (Math.min(...ms) < PIANO_DE || Math.max(...ms) > PIANO_ATE) return errar(m, 'A escala não cabe no teclado a partir dessa oitava. Comece em outro ' + nomeTonica(tf.t) + '.')
      setOit(o)
      avancar(m, 0)
      return
    }
    if (m === alvos[pos]) return avancar(m, pos)
    const anterior = seq[pos - 1]
    const dist = Math.abs(alvos[pos] - alvos[pos - 1])
    const dir = alvos[pos] > alvos[pos - 1] ? 'acima' : 'abaixo'
    errar(m, `Você tocou ${nomeTocada}. A próxima nota fica ${nomeDist(dist)} ${dir} de ${nomeP(anterior)}.` + (errosAqui >= 1 ? ` É a letra ${nomeP(seq[pos]).replace(/[♯♭𝄪𝄫]/g, '')}.` : ''))
  }

  function avancar(m: number, p: number) {
    setMarks({ [m]: 'ok' })
    setErrosAqui(0)
    const np = p + 1
    setPos(np)
    if (np >= seqBase.length) {
      const prec = Math.round((seqBase.length / (seqBase.length + erros)) * 100)
      registrar('escalas-piano', { melhor: prec, acertos: seqBase.length, tentativas: seqBase.length + erros })
      lv.registrarNivel(erros <= 1)
      setMsg({ tipo: 'ok', texto: `${titulo(tf.e, tf.t)} completa! ${erros === 0 ? 'Sem erros.' : `${erros} erro(s).`}` })
    } else setMsg(null)
  }

  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Enter' && fim) novo() }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })

  // pentagrama: só as notas já tocadas (no fim, a escala inteira com os graus)
  const tocadas = fim ? seq : seq.slice(0, pos)
  const cor = (i: number) => (fim ? '#16a34a' : i === pos - 1 ? '#2563eb' : undefined)
  const notas = tocadas.length
    ? notasStaff(tf.e, tocadas, fim && !tf.descer ? 'ambos' : 'nomes', cor)
    : []
  const passoAtual = pos === 0 ? undefined : tf.descer && pos >= base.length ? 2 * (base.length - 1) - pos : pos - 1
  const dica = ajuda || errosAqui >= 2
  const alvoTecla = !fim && (pos > 0 || oit !== null) ? alvos[pos] : !fim ? midiP(tf.t) : null
  const marksFinais: Record<number, Marca> = dica && alvoTecla !== null ? { ...marks, [alvoTecla]: marks[alvoTecla] ?? 'dica' } : marks

  return (
    <div className="exercise">
      <Niveis nomes={NIVEIS_CONSTRUIR} nivel={lv.nivel} max={lv.max} progresso={lv.progresso} onChange={(nv) => { lv.setNivel(nv); novo(nv) }} />
      <div className="toolbar">
        <label className="check"><input type="checkbox" checked={ajuda} onChange={(e) => setAjuda(e.target.checked)} /> Ajuda (fórmula, nomes e próxima tecla)</label>
        {fim && <button className="btn small" onClick={() => tocarEscala(base, tf.descer)}>▶ Ouvir a escala</button>}
      </div>
      <h2 className="prompt">
        {fim ? 'Muito bem!' : <>Toque <b>{titulo(tf.e, tf.t)}</b>{tf.descer ? ', subindo e descendo' : ', subindo'}</>}
      </h2>
      {!fim && <p className="muted small center">{NOMES_FAMILIA[tf.e.familia]} · {seqBase.length} notas · comece em qualquer {nomeTonica(tf.t)} do teclado</p>}
      {(ajuda || fim) && <><Passos e={tf.e} atual={fim ? undefined : passoAtual} /><Graus e={tf.e} /></>}
      <div className="staff-box">
        <Staff clef="treble" time={null} measures={[notas]} width={Math.max(420, seqBase.length * 46)} height={150} y={20} />
      </div>
      <div className="feedback" aria-live="polite">
        {msg ? <span className={msg.tipo}>{msg.texto}</span> : <span className="muted">Nota {Math.min(pos + 1, seqBase.length)} de {seqBase.length}</span>}
      </div>
      {fim && <p className="muted small center">{tf.e.explica}</p>}
      <Piano from={PIANO_DE} to={PIANO_ATE} onNote={onNote} marks={marksFinais} labels={ajuda} />
      <div className="row center">
        {fim ? <button className="btn primary" onClick={() => novo()}>Próxima escala (Enter)</button>
          : <button className="btn" onClick={() => novo()}>Outra escala</button>}
      </div>
      <p className="muted small center">Teclado do computador: A S D F G H J K = Dó Ré Mi Fá Sol Lá Si Dó (pretas: W E T Y U). Teclado MIDI também funciona.</p>
    </div>
  )
}
