// Lições de teoria com exemplos visuais e sonoros.
import { useEffect } from 'react'
import Staff, { type SNote, type StaffProps } from '../components/Staff'
import Piano from '../components/Piano'
import { tocarCompassos, tocarSequencia, type NotaTocada, type OpcoesPlay } from '../music/player'
import { compasso } from '../music/rhythm'
import { nome, n as nota, vexKey } from '../music/notes'
import { registrar } from '../store'

function Exemplo(props: StaffProps & { play?: OpcoesPlay | false; legenda?: string; som?: NotaTocada[] }) {
  const { play = {}, legenda, som, ...staff } = props
  const c = compasso(staff.time ?? '4/4')
  const ouvir = () => (som ? tocarSequencia(som, { compasso: c, ...(play || {}) }) : tocarCompassos(staff.measures, { compasso: c, ...(play || {}) }))
  return (
    <figure className="exemplo">
      <div className="staff-box">
        <Staff height={135} y={5} {...staff} />
      </div>
      <figcaption>
        {play !== false && <button className="btn small" onClick={ouvir}>▶ Ouvir</button>}
        {legenda && <span>{legenda}</span>}
      </figcaption>
    </figure>
  )
}

function Concluir({ id }: { id: string }) {
  useEffect(() => {
    registrar(id, { feito: true })
  }, [id])
  return null
}

const rotular = (keys: string[], dur = 'w'): SNote[] => keys.map((k) => ({ keys: [k], dur, label: nome(nota(k)) }))
const escala = (de: string, ate: string, dur = 'q') => {
  const out: string[] = []
  for (let d = nota(de); d <= nota(ate); d++) out.push(vexKey(d))
  return rotular(out, dur)
}
/** nota rítmica (Dó5) com a figura pedida */
const r = (dur: string, extra: Partial<SNote> = {}): SNote => ({ keys: ['c/5'], dur, ...extra })

// ───────────────────────── Lição 1 ─────────────────────────
export function LicaoPentagrama() {
  return (
    <article className="lesson">
      <Concluir id="licao-pentagrama" />
      <h2>O pentagrama</h2>
      <p>A música é escrita no <b>pentagrama</b>: <b>5 linhas</b> e <b>4 espaços</b>, sempre contados <b>de baixo para cima</b>. Quanto mais alta a nota no pentagrama, mais aguda ela soa.</p>
      <Exemplo clef={null} measures={[[]]} play={false} width={420} height={100} legenda="1ª linha embaixo, 5ª linha em cima" />

      <h2>As sete notas</h2>
      <p>São só sete nomes, que se repetem em ciclo: <b>Dó, Ré, Mi, Fá, Sol, Lá, Si</b> — e depois Dó de novo, uma oitava acima. Cada degrau (linha → espaço → linha) é a próxima nota.</p>

      <h2>Clave de Sol</h2>
      <p>A clave diz qual nota fica em qual linha. A <b>clave de Sol</b> começa enrolada na <b>2ª linha</b>: ali é o <b>Sol</b>. Ela é usada para os sons mais agudos — no piano, geralmente a <b>mão direita</b>.</p>
      <Exemplo clef="treble" measures={[escala('c/4', 'c/5')]} width={560} legenda="Dó central até o Dó seguinte" />
      <p className="dica">Linhas (de baixo para cima): <b>Mi – Sol – Si – Ré – Fá</b>. Espaços: <b>Fá – Lá – Dó – Mi</b>.</p>
      <Exemplo clef="treble" measures={[rotular(['e/4', 'g/4', 'b/4', 'd/5', 'f/5']), rotular(['f/4', 'a/4', 'c/5', 'e/5'])]} width={620} play={{ bpm: 160 }} legenda="Notas nas linhas | notas nos espaços" />

      <h2>Clave de Fá</h2>
      <p>A <b>clave de Fá</b> tem dois pontinhos em volta da <b>4ª linha</b>: ali é o <b>Fá</b>. Ela é usada para os sons graves — no piano, geralmente a <b>mão esquerda</b>.</p>
      <Exemplo clef="bass" measures={[escala('c/3', 'c/4')]} width={560} />
      <p className="dica">Linhas: <b>Sol – Si – Ré – Fá – Lá</b>. Espaços: <b>Lá – Dó – Mi – Sol</b>.</p>
      <Exemplo clef="bass" measures={[rotular(['g/2', 'b/2', 'd/3', 'f/3', 'a/3']), rotular(['a/2', 'c/3', 'e/3', 'g/3'])]} width={620} play={{ bpm: 160 }} legenda="Notas nas linhas | notas nos espaços" />

      <h2>Linhas suplementares e o Dó central</h2>
      <p>Notas que não cabem no pentagrama usam pequenas <b>linhas suplementares</b>. O <b>Dó central</b> (Dó4) fica numa linha suplementar logo <b>abaixo</b> da clave de Sol e logo <b>acima</b> da clave de Fá — é a mesma tecla no piano!</p>
      <div className="grid2">
        <Exemplo clef="treble" measures={[rotular(['c/4', 'a/5', 'c/6'])]} width={300} height={165} />
        <Exemplo clef="bass" measures={[rotular(['c/4', 'e/2', 'c/2'])]} width={300} height={165} />
      </div>
      <div className="next-box"><a className="btn primary" href="#/notas-sol">Praticar: clave de Sol →</a></div>
    </article>
  )
}

// ───────────────────────── Lição 2: figuras ─────────────────────────
const FIGS: { dur: string; nome: string; valor: string; relacao: string }[] = [
  { dur: 'w', nome: 'Semibreve', valor: '4 tempos', relacao: 'a figura mais longa usada no dia a dia' },
  { dur: 'h', nome: 'Mínima', valor: '2 tempos', relacao: 'metade da semibreve' },
  { dur: 'q', nome: 'Semínima', valor: '1 tempo', relacao: 'metade da mínima' },
  { dur: '8', nome: 'Colcheia', valor: '½ tempo', relacao: 'metade da semínima (1 bandeirola)' },
  { dur: '16', nome: 'Semicolcheia', valor: '¼ de tempo', relacao: 'metade da colcheia (2 bandeirolas)' },
]

export function LicaoFiguras() {
  return (
    <article className="lesson">
      <Concluir id="licao-figuras" />
      <h2>Figuras de duração</h2>
      <p>A <b>altura</b> da nota no pentagrama diz <i>qual</i> nota tocar. O <b>formato</b> dela (a figura) diz <i>por quanto tempo</i>. Tomando a semínima como 1 tempo, cada figura vale <b>metade</b> da anterior:</p>
      <div className="fig-table">
        {FIGS.map((f) => (
          <div key={f.dur} className="fig-row">
            <div className="fig-staff">
              <Staff clef={null} measures={[[{ keys: ['c/5'], dur: f.dur }]]} width={120} height={110} y={5} />
            </div>
            <div>
              <b>{f.nome}</b> — {f.valor}
              <div className="muted small">{f.relacao}</div>
            </div>
            <button className="btn small" onClick={() => tocarCompassos([[{ keys: ['c/5'], dur: f.dur }]], { metronomo: true, bpm: 70, compassos: 1 })} aria-label={`Ouvir ${f.nome}`}>▶</button>
          </div>
        ))}
      </div>
      <h2>Relações entre as figuras</h2>
      <p>1 semibreve = 2 mínimas = 4 semínimas = 8 colcheias = 16 semicolcheias. Escute com o metrônomo: cada clique é 1 tempo, e as notas vão ficando mais rápidas.</p>
      <Exemplo
        clef="treble" time="4/4" minMeasureWidth={170}
        measures={[[r('w')], [r('h'), r('h')], [r('q'), r('q'), r('q'), r('q')], Array.from({ length: 8 }, () => r('8')), Array.from({ length: 16 }, () => r('16'))]}
        width={760} play={{ metronomo: true, bpm: 60 }}
      />
      <p className="dica">Colcheias e semicolcheias vizinhas são unidas por <b>barras (feixes)</b> em vez de bandeirolas, agrupadas por tempo. Isso ajuda a ver onde cada tempo começa.</p>

      <h2>Ponto de aumento</h2>
      <p>Um <b>ponto</b> ao lado da nota aumenta <b>metade</b> do seu valor: mínima pontuada = 2 + 1 = <b>3 tempos</b>; semínima pontuada = 1 + ½ = <b>1½ tempo</b>; colcheia pontuada = ½ + ¼ = <b>¾ de tempo</b>.</p>
      <Exemplo clef="treble" time="4/4" measures={[[r('h', { dots: 1 }), r('q')], [r('q', { dots: 1 }), r('8'), r('h')]]} width={520} play={{ metronomo: true, bpm: 70 }} />

      <h2>Ligadura de valor</h2>
      <p>Uma <b>ligadura</b> (curva entre duas notas <b>iguais</b>) soma as durações: a segunda nota não é tocada de novo, só continua soando. Ela permite que uma nota atravesse a barra de compasso.</p>
      <Exemplo
        clef="treble" time="4/4" measures={[[r('q'), r('q'), r('h')], [r('h'), r('q'), r('q')]]} ligaduras={[{ de: 2, ate: 3, tipo: 'tie' }]}
        width={520} play={{ metronomo: true, bpm: 70 }}
        som={[{ t: 0, dur: 1, notas: ['C5'] }, { t: 1, dur: 1, notas: ['C5'] }, { t: 2, dur: 4, notas: ['C5'] }, { t: 6, dur: 1, notas: ['C5'] }, { t: 7, dur: 1, notas: ['C5'] }]}
        legenda="A mínima ligada soa por 4 tempos"
      />
      <div className="next-box"><a className="btn primary" href="#/quiz-figuras">Praticar: figuras musicais →</a></div>
    </article>
  )
}

// ───────────────────────── Lição 3: pausas ─────────────────────────
const PAUSAS: { dur: string; nome: string; valor: string; como: string }[] = [
  { dur: 'w', nome: 'Pausa de semibreve', valor: '4 tempos (ou um compasso inteiro de silêncio)', como: 'retângulo pendurado na 4ª linha' },
  { dur: 'h', nome: 'Pausa de mínima', valor: '2 tempos', como: 'retângulo apoiado sobre a 3ª linha' },
  { dur: 'q', nome: 'Pausa de semínima', valor: '1 tempo', como: 'sinal em zigue-zague' },
  { dur: '8', nome: 'Pausa de colcheia', valor: '½ tempo', como: 'um "7" com uma bolinha' },
  { dur: '16', nome: 'Pausa de semicolcheia', valor: '¼ de tempo', como: 'duas bolinhas' },
]

export function LicaoPausas() {
  return (
    <article className="lesson">
      <Concluir id="licao-pausas" />
      <h2>O silêncio também tem duração</h2>
      <p>A <b>pausa</b> indica um silêncio medido. Cada figura tem uma pausa com <b>exatamente a mesma duração</b>. Durante a pausa você continua contando os tempos, mas não toca.</p>
      <div className="fig-table">
        {PAUSAS.map((f) => (
          <div key={f.dur} className="fig-row">
            <div className="fig-staff">
              <Staff clef={null} measures={[[{ keys: ['c/5'], dur: f.dur }, { keys: ['b/4'], dur: f.dur, rest: true }]]} width={170} height={110} y={5} />
            </div>
            <div>
              <b>{f.nome}</b> — {f.valor}
              <div className="muted small">{f.como}. À esquerda, a figura de mesmo valor.</div>
            </div>
          </div>
        ))}
      </div>
      <p className="dica"><b>Semibreve × mínima:</b> as duas são retângulos. A de semibreve fica <b>pendurada</b> (embaixo da linha, "pesada"); a de mínima fica <b>sentada</b> (em cima da linha).</p>

      <h2>Ouvindo as pausas</h2>
      <p>Conte "1 2 3 4" com o metrônomo e perceba os silêncios:</p>
      <Exemplo clef="treble" time="4/4" measures={[[r('q'), r('q', { rest: true }), r('q'), r('q', { rest: true })], [r('h', { rest: true }), r('q'), r('q')], [r('8'), r('8', { rest: true }), r('8'), r('8', { rest: true }), r('q'), r('q', { rest: true })]]} width={700} play={{ metronomo: true, bpm: 70 }} />
      <h2>Pausas pontuadas</h2>
      <p>O ponto de aumento também vale para pausas: uma pausa de semínima pontuada dura 1½ tempo. Elas são comuns em compassos compostos (6/8, 9/8, 12/8).</p>
      <Exemplo clef="treble" time="6/8" measures={[[r('q', { rest: true, dots: 1 }), r('8'), r('8'), r('8')], [r('q', { dots: 1 }), r('q', { rest: true, dots: 1 })]]} width={520} play={{ metronomo: true, bpm: 60 }} />
      <div className="next-box"><a className="btn primary" href="#/quiz-pausas">Praticar: pausas →</a></div>
    </article>
  )
}

// ───────────────────────── Lição 4: compassos ─────────────────────────
export function LicaoCompassos() {
  const m = (k: string[], dur = 'q') => k.map((x) => ({ keys: [x], dur }))
  return (
    <article className="lesson">
      <Concluir id="licao-compassos" />
      <h2>O que é compasso</h2>
      <p>A música é dividida em <b>compassos</b>, separados por <b>barras verticais</b>. Cada compasso tem a mesma quantidade de tempos. A <b>barra dupla final</b> indica o fim da música.</p>

      <h2>Fórmula de compasso</h2>
      <ul>
        <li>O número de <b>cima</b> diz <b>quantas figuras</b> cabem em cada compasso.</li>
        <li>O número de <b>baixo</b> diz <b>qual figura</b> é contada: 4 = semínima, 8 = colcheia, 2 = mínima.</li>
      </ul>
      <p>O <b>1º tempo</b> de cada compasso é o <b>tempo forte</b>. No metrônomo, ele é o clique mais agudo.</p>

      <h2>Compassos simples</h2>
      <p>O pulso é uma figura simples (a semínima), que se divide em <b>2</b> colcheias.</p>
      <Exemplo clef="treble" time="2/4" measures={[m(['c/4', 'g/4']), m(['c/4', 'g/4']), m(['e/4', 'g/4'])]} width={520} play={{ metronomo: true, acompanhamento: true }} legenda="2/4 — binário: FOR-te fra-co (marcha)" />
      <Exemplo clef="treble" time="3/4" measures={[m(['c/4', 'e/4', 'g/4']), m(['c/4', 'e/4', 'g/4']), [{ keys: ['c/5'], dur: 'h', dots: 1 }]]} width={560} play={{ metronomo: true, acompanhamento: true }} legenda="3/4 — ternário: FOR-te fra-co fra-co (valsa)" />
      <Exemplo clef="treble" time="4/4" measures={[m(['c/4', 'd/4', 'e/4', 'f/4']), [{ keys: ['g/4'], dur: 'h' }, { keys: ['g/4'], dur: 'h' }]]} width={560} play={{ metronomo: true, acompanhamento: true }} legenda="4/4 — quaternário: forte, fraco, meio-forte, fraco" />
      <Exemplo clef="treble" time="5/4" measures={[m(['c/4', 'e/4', 'g/4', 'e/4', 'g/4']), [{ keys: ['c/5'], dur: 'h', dots: 1 }, { keys: ['g/4'], dur: 'h' }]]} width={600} play={{ metronomo: true, acompanhamento: true }} legenda="5/4 — quinário: agrupado 3 + 2" />

      <h2>Compassos compostos</h2>
      <p>O pulso é uma <b>semínima pontuada</b>, que se divide em <b>3</b> colcheias. Em 6/8 há 6 colcheias, mas sentimos <b>2 pulsos</b> (1-2-3, 4-5-6).</p>
      <Exemplo clef="treble" time="6/8" measures={[m(['c/5', 'b/4', 'a/4', 'g/4', 'a/4', 'b/4'], '8'), [{ keys: ['c/5'], dur: 'q', dots: 1 }, { keys: ['g/4'], dur: 'q', dots: 1 }]]} width={560} play={{ metronomo: true, acompanhamento: true, bpm: 60 }} legenda="6/8 — binário composto: 2 pulsos de 3 colcheias" />
      <Exemplo clef="treble" time="9/8" measures={[m(['e/4', 'g/4', 'c/5', 'e/4', 'g/4', 'c/5', 'e/4', 'g/4', 'c/5'], '8'), [{ keys: ['c/5'], dur: 'h', dots: 1 }, { keys: ['g/4'], dur: 'q', dots: 1 }]]} width={620} play={{ metronomo: true, acompanhamento: true, bpm: 60 }} legenda="9/8 — ternário composto: 3 pulsos" />
      <Exemplo clef="treble" time="12/8" measures={[[{ keys: ['c/5'], dur: 'q', dots: 1 }, { keys: ['e/5'], dur: 'q', dots: 1 }, { keys: ['g/5'], dur: 'q', dots: 1 }, { keys: ['e/5'], dur: 'q', dots: 1 }]]} width={460} play={{ metronomo: true, acompanhamento: true, bpm: 60 }} legenda="12/8 — quaternário composto: 4 pulsos" />
      <p className="dica"><b>3/4 × 6/8:</b> os dois têm 6 colcheias por compasso, mas o 3/4 agrupa em <b>3 × 2</b> e o 6/8 em <b>2 × 3</b>. Por isso o balanço é diferente.</p>

      <h2>Somando os tempos</h2>
      <p>Para conferir um compasso, some as figuras e pausas. Em 3/4: mínima (2) + semínima (1) = 3 ✓. Em 6/8, conte em colcheias: semínima pontuada (3) + 3 colcheias (3) = 6 ✓.</p>
      <div className="next-box"><a className="btn primary" href="#/quiz-compassos">Praticar: compassos →</a></div>
    </article>
  )
}

// ───────────────────────── Teclado ─────────────────────────
export function LicaoTeclado() {
  return (
    <article className="lesson">
      <Concluir id="licao-teclado" />
      <h2>Encontrando o Dó</h2>
      <p>As teclas pretas aparecem em grupos de <b>2</b> e de <b>3</b>. O <b>Dó</b> é sempre a tecla branca <b>imediatamente à esquerda do grupo de 2 pretas</b>. A partir dele seguem Ré, Mi, Fá, Sol, Lá, Si.</p>
      <Piano from={48} to={72} labels />
      <p className="muted small">Toque nas teclas para ouvir. No computador: A S D F G H J K tocam as brancas a partir do primeiro Dó.</p>

      <h2>Do pentagrama para o teclado</h2>
      <p>O <b>Dó central (Dó4)</b> fica no meio do piano. Na clave de Sol, ele está na linha suplementar abaixo do pentagrama; na de Fá, na linha suplementar acima. Subir um degrau no pentagrama = andar <b>uma tecla branca para a direita</b>.</p>
      <Exemplo clef="treble" measures={[escala('c/4', 'g/4')]} width={460} legenda="Posição de 5 dedos da mão direita: polegar no Dó central" />
      <Exemplo clef="bass" measures={[escala('c/3', 'g/3')]} width={460} legenda="Mão esquerda: mindinho no Dó3" />
      <h2>Teclas pretas</h2>
      <p>As teclas pretas são os <b>sustenidos (♯)</b> e <b>bemóis (♭)</b>: a preta entre Dó e Ré é Dó♯ ou Ré♭. Nos primeiros exercícios usaremos só as teclas brancas.</p>
      <div className="next-box"><a className="btn primary" href="#/piano-sol">Praticar: leitura no piano →</a></div>
    </article>
  )
}

// ───────────────────────── Ritmo na prática ─────────────────────────
export function LicaoRitmo() {
  return (
    <article className="lesson">
      <Concluir id="licao-ritmo" />
      <h2>Contando em voz alta</h2>
      <p>A forma mais segura de ler ritmo é <b>contar os tempos</b> enquanto toca: “<b>1 2 3 4</b>”. Para colcheias, divida cada tempo em dois: “<b>1 e 2 e 3 e 4 e</b>”. Em compassos compostos, conte as colcheias em grupos de três: “<b>1 2 3 4 5 6</b>”.</p>
      <Exemplo
        clef="treble" time="4/4"
        measures={[[r('q', { labelTop: '1' }), r('q', { labelTop: '2' }), r('h', { labelTop: '3 (4)' })], [r('8', { labelTop: '1' }), r('8', { labelTop: 'e' }), r('8', { labelTop: '2' }), r('8', { labelTop: 'e' }), r('q', { labelTop: '3' }), r('q', { rest: true, labelTop: '(4)' })]]}
        width={600} height={150} play={{ metronomo: true, bpm: 70, acompanhamento: true }}
      />
      <h2>Como funcionam os exercícios</h2>
      <ol>
        <li>Escolha a <b>fórmula de compasso</b>, a <b>quantidade de compassos</b> (2 a 10) e o <b>andamento</b>.</li>
        <li>Clique em <b>Ouvir</b>: o ritmo é tocado no piano, com acompanhamento.</li>
        <li>Clique em <b>Começar</b>: o metrônomo conta 1 compasso antes.</li>
        <li>Toque no tempo certo: tecla <b>Espaço</b>, o botão grande ou o piano. Cada toque soa a nota escrita.</li>
        <li>Cada nota fica <span className="ok">verde</span> (no tempo), <span className="warn">amarela</span> (um pouco fora) ou <span className="erro">vermelha</span> (errou).</li>
      </ol>
      <p className="muted">Use fones de ouvido com fio se possível. Fones Bluetooth têm atraso de áudio.</p>
      <div className="next-box"><a className="btn primary" href="#/ritmo">Praticar: toque o ritmo →</a></div>
    </article>
  )
}

// ───────────────────────── Acidentes e armaduras ─────────────────────────
export function LicaoAcidentes() {
  const nt = (k: string, acc?: string, label?: string): SNote => ({ keys: [k], dur: 'q', acc, label })
  return (
    <article className="lesson">
      <Concluir id="licao-acidentes" />
      <h2>Acidentes</h2>
      <p>Os <b>acidentes</b> alteram a altura de uma nota em meio tom (a tecla vizinha mais próxima, branca ou preta):</p>
      <ul>
        <li><b>Sustenido (♯)</b>: sobe meio tom. Fá♯ é a tecla preta logo à direita do Fá.</li>
        <li><b>Bemol (♭)</b>: desce meio tom. Si♭ é a tecla preta logo à esquerda do Si.</li>
        <li><b>Bequadro (♮)</b>: cancela o acidente e volta à nota natural.</li>
      </ul>
      <Exemplo clef="treble" measures={[[nt('f/4', undefined, 'Fá'), nt('f#/4', '#', 'Fá♯'), nt('f/4', 'n', 'Fá♮')], [nt('b/4', undefined, 'Si'), nt('bb/4', 'b', 'Si♭'), nt('b/4', 'n', 'Si♮')]]} width={560} play={{ bpm: 80 }} />
      <p className="dica">O acidente escrito vale até o <b>fim do compasso</b> para aquela nota. Na barra seguinte, ele deixa de valer.</p>
      <p>Uma mesma tecla pode ter dois nomes (<b>enarmonia</b>): Dó♯ e Ré♭ soam igual.</p>

      <h2>Armadura de clave</h2>
      <p>Quando uma música usa sempre os mesmos acidentes, eles são escritos uma única vez no início de cada linha: a <b>armadura de clave</b>. Eles valem para <b>todas</b> as notas com aquele nome, em qualquer oitava.</p>
      <div className="grid2">
        <Exemplo clef="treble" keySig="G" measures={[[nt('f/4', undefined, 'Fá♯'), nt('g/4', undefined, 'Sol'), nt('f/5', undefined, 'Fá♯')]]} width={300} legenda="Sol maior: 1 sustenido (Fá♯)" som={[{ t: 0, dur: 1, notas: ['F#4'] }, { t: 1, dur: 1, notas: ['G4'] }, { t: 2, dur: 1, notas: ['F#5'] }]} />
        <Exemplo clef="treble" keySig="F" measures={[[nt('b/4', undefined, 'Si♭'), nt('a/4', undefined, 'Lá'), nt('b/3', undefined, 'Si♭')]]} width={300} legenda="Fá maior: 1 bemol (Si♭)" som={[{ t: 0, dur: 1, notas: ['Bb4'] }, { t: 1, dur: 1, notas: ['A4'] }, { t: 2, dur: 1, notas: ['Bb3'] }]} />
      </div>
      <h2>Ordem dos acidentes</h2>
      <p>Os acidentes da armadura aparecem sempre na mesma ordem:</p>
      <ul>
        <li><b>Sustenidos:</b> Fá – Dó – Sol – Ré – Lá – Mi – Si</li>
        <li><b>Bemóis:</b> Si – Mi – Lá – Ré – Sol – Dó – Fá (a ordem dos sustenidos ao contrário)</li>
      </ul>
      <div className="grid2">
        <Exemplo clef="treble" keySig="A" measures={[[]]} width={300} play={false} legenda="Lá maior: Fá♯, Dó♯, Sol♯" />
        <Exemplo clef="treble" keySig="Eb" measures={[[]]} width={300} play={false} legenda="Mi♭ maior: Si♭, Mi♭, Lá♭" />
      </div>
      <p className="dica"><b>Truques para descobrir a tonalidade maior:</b> com sustenidos, suba meio tom a partir do último sustenido (Fá♯ → Sol maior). Com bemóis, o penúltimo bemol dá o nome da tonalidade (Si♭ Mi♭ → Si♭ maior).</p>
      <div className="next-box"><a className="btn primary" href="#/armaduras">Ir para o laboratório de armaduras →</a></div>
    </article>
  )
}

// ───────────────────────── Intervalos ─────────────────────────
export function LicaoIntervalos() {
  const par = (a: string, b: string, label: string): SNote[] => [{ keys: [a], dur: 'h' }, { keys: [b], dur: 'h', label }]
  return (
    <article className="lesson">
      <Concluir id="licao-intervalos" />
      <h2>Subir, descer ou repetir</h2>
      <p>Ler música também é perceber o <b>desenho</b> da melodia: se a próxima nota está mais alta (sobe), mais baixa (desce) ou na mesma posição (repete).</p>
      <Exemplo clef="treble" measures={[[...par('c/4', 'e/4', 'sobe')], [...par('g/4', 'd/4', 'desce')], [...par('a/4', 'a/4', 'repete')]]} width={620} />

      <h2>Contando a distância</h2>
      <p>O <b>intervalo</b> é a distância entre duas notas. Conte <b>as duas notas e todas as do meio</b>: de Dó a Mi temos Dó-Ré-Mi = <b>3ª</b>. De Dó a Sol, Dó-Ré-Mi-Fá-Sol = <b>5ª</b>.</p>
      <p className="dica">No pentagrama: linha → espaço vizinho = 2ª; linha → linha seguinte = 3ª; espaço → espaço seguinte = 3ª.</p>
      <Exemplo clef="treble" measures={[[...par('c/4', 'd/4', '2ª')], [...par('c/4', 'e/4', '3ª')], [...par('c/4', 'f/4', '4ª')], [...par('c/4', 'g/4', '5ª')]]} width={700} />
      <Exemplo clef="treble" measures={[[...par('c/4', 'a/4', '6ª')], [...par('c/4', 'b/4', '7ª')], [...par('c/4', 'c/5', '8ª')]]} width={540} />

      <h2>Qualidade: maior, menor e justa</h2>
      <p>Intervalos com o mesmo número podem ter tamanhos diferentes, medidos em <b>semitons</b> (teclas vizinhas):</p>
      <ul>
        <li><b>2ª menor</b> = 1 semitom (Mi–Fá) · <b>2ª maior</b> = 2 semitons (Dó–Ré)</li>
        <li><b>3ª menor</b> = 3 semitons (Ré–Fá) · <b>3ª maior</b> = 4 semitons (Dó–Mi)</li>
        <li><b>4ª justa</b> = 5 · <b>5ª justa</b> = 7 · <b>8ª justa</b> = 12 semitons</li>
        <li><b>6ª</b>: menor 8, maior 9 · <b>7ª</b>: menor 10, maior 11</li>
        <li><b>Trítono</b> = 6 semitons (Fá–Si): 4ª aumentada ou 5ª diminuta</li>
      </ul>
      <p className="dica">Referências sonoras: 3ª maior = início de “Oh! Susana”; 4ª justa = “Lá vem a noiva”; 5ª justa = tema de “Star Wars”; 8ª = “Somewhere over the rainbow”.</p>
      <div className="next-box"><a className="btn primary" href="#/intervalos">Praticar: saltos e intervalos →</a></div>
    </article>
  )
}
