# Partitura 𝄞

Jogo educativo para aprender a **ler partitura** e **tocar piano**, com exercícios de repetição.
Roda na **web** e vira **app Android/iOS** com Capacitor, usando o mesmo código.

## Stack

| Parte | Tecnologia |
|---|---|
| Interface | React 19 + TypeScript + Vite |
| Partitura (pentagrama, claves, figuras) | [VexFlow 4](https://www.vexflow.com/) (SVG) |
| Áudio (piano, metrônomo) | [Tone.js](https://tonejs.github.io/) com o **Salamander Grand Piano** gravado (3 camadas de intensidade, em `public/piano`, funciona offline), reverberação e compressor |
| Entrada | Mouse/toque, teclado do computador e **teclado MIDI** (Web MIDI API) |
| Mobile | [Capacitor](https://capacitorjs.com/) (Android e iOS) |
| Progresso | `localStorage` |

## Rodando

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # gera dist/ (site estático)
npm run build:single # gera dist-single/index.html (tudo em 1 arquivo)
```

## App para celular e tablet (Android)

O passo a passo completo está em **[COMO-GERAR-APK.md](COMO-GERAR-APK.md)**. Resumo:

- **Sem instalar nada:** envie o projeto para o GitHub. O workflow `.github/workflows/android.yml` gera o APK; baixe-o em *Actions → Artifacts*.
- **No computador (Android Studio):** `npm run android:abrir` e depois *Build → Build APK(s)*, ou `npm run android:apk`.

O mesmo APK serve para celular e tablet; o layout se adapta à tela e à rotação.

## Trilha de aprendizado

A trilha tem 6 unidades. Cada atividade indica os pré-requisitos recomendados, mas todas funcionam isoladamente.

1. **Leitura de notas**: lição do pentagrama; *Que nota é esta?* (Sol, Fá e misto) com repetição espaçada por nota; *Escreva a nota* no pentagrama.
2. **Figuras e pausas**: lições separadas de figuras e de pausas, cada uma com seu quiz em 4 níveis.
3. **Compasso e ritmo**
   - Lição de compassos simples (2/4, 3/4, 4/4, 5/4) e compostos (6/8, 9/8, 12/8), com áudio.
   - Quiz de compassos (completar, falta/sobra, descobrir a fórmula), com opção de estudar uma fórmula específica.
   - **Construtor de compassos**: arraste ou clique em figuras e pausas; monte, complete e corrija compassos com validação explicada.
   - **Toque o ritmo**: escolha a fórmula, de 2 a 10 compassos e o andamento. O ritmo soa em notas de piano com acompanhamento.
   - **Maestro do compasso** (minigame): reconheça a fórmula pelo ouvido e treine a pulsação e o 1º tempo.
4. **Acidentes e armaduras**: lição e laboratório em 5 níveis (identificar acidentes, ler notas alteradas, notas da armadura, tonalidade, completar a armadura).
5. **Piano e percepção**
   - **Partitura para teclado** (minigame): 5 níveis, de nota isolada até pequenas melodias com ritmo e armadura.
   - **Que nota o piano tocou?**: percepção auditiva em 5 níveis, de Dó-Ré-Mi até sustenidos e bemóis.
   - Lição e treino de **intervalos** em 6 níveis: direção, distância, qualidade, intervalo pelo som e sequências.
6. **Lendo partituras**
   - **Leitura de melodias**: 5 níveis e 3 modos (livre, sequencial com tempo por nota, primeira vista no andamento).
   - **Melodia com ritmo no piano.**
   - **Dicionário de símbolos**: dinâmicas, articulações, andamento, fermata, repetições, ligaduras e outros, com demonstração sonora. Tem também um quiz.
   - **Desafio integrado**: uma partitura completa com perguntas que combinam todos os conteúdos.
   - **Escritor de partituras**: escreva sua própria partitura (uma pauta ou sistema de piano com mão direita e esquerda) e ouça no piano. Você escolhe compasso, tonalidade e andamento. Dá para escrever clicando no pentagrama (a altura vem da posição do clique), pelo piano na tela ou pelo teclado do computador (letras C–B, números para as figuras como no MuseScore). Tem pausas, ponto, acidentes, ligaduras de valor, acordes, desfazer/refazer e validação da duração de cada compasso. Os acidentes seguem as regras de escrita (armadura e acidente válido até o fim do compasso). Ao tocar, as notas acendem na partitura e no teclado, com metrônomo e contagem opcionais. As partituras ficam salvas no aparelho e podem ser exportadas em MusicXML para o MuseScore.

### Progressão e prática

- **Níveis por atividade**: o próximo nível é desbloqueado com 8 acertos nas últimas 10 respostas.
- **Feedback imediato** com explicação do conceito em cada resposta.
- **Revisão de erros**: cada pergunta errada vira um cartão (sistema Leitner: volta no mesmo dia, depois em 1, 3, 7, 16 e 35 dias).
- **Repetição espaçada por conteúdo**: o intervalo de revisão cresce quando a precisão é alta e volta a 1 dia quando cai.
- **Histórico** por habilidade (tentativas, acertos, erros, precisão recente, nível, próxima revisão), com gráfico dos últimos 14 dias.
- **Metas e conquistas**: meta diária configurável, sequência de dias, XP e 18 conquistas.

## Estrutura

```
src/
  music/
    notes.ts     notas, acidentes, armaduras, intervalos, ordem de desbloqueio
    rhythm.ts    figuras, pausas, fórmulas de compasso, gerador rítmico por pulso
    melody.ts    gerador de melodias (ritmo + alturas + armadura + acidentes)
    player.ts    reprodução sincronizada (notas, pausas, dinâmica, articulação, metrônomo, acompanhamento)
    audio.ts     Tone.js: piano, metrônomo, relógio de áudio, latência
    simbolos.ts  dados do dicionário de símbolos
    escritor.ts  modelo do escritor de partituras: edição validada, grafia de acidentes, reprodução, MusicXML
  components/
    Staff.tsx           pentagrama VexFlow (armadura, quebra de linha, acidentes, articulações, dinâmicas, ligaduras…)
    EditorPauta.tsx     partitura editável (sistema de piano, seleção e inserção por clique)
    Piano.tsx           teclado (toque, teclado do PC, MIDI)
    MultipleChoice.tsx  motor de perguntas usado pela maioria das atividades
    Niveis.tsx, Controles.tsx, RespostaNota.tsx
  hooks/useNivel.ts     níveis progressivos por habilidade
  store.ts              progresso, revisão espaçada, cartões de erro, metas e conquistas
  pages/                uma página por atividade
  App.tsx               trilha, pré-requisitos, navegação e avisos
```

## Próximos passos sugeridos

- Pauta dupla (sistema de piano, as duas mãos)
- Detecção de altura pelo microfone (piano acústico), por exemplo com `pitchy`
- Calibração de latência no ritmo (importante para Bluetooth/Android)
- Contas de usuário e sincronização do progresso (por exemplo com um backend NestJS)

## Créditos

- Samples de piano: *Salamander Grand Piano V3*, de Alexander Holm (licença CC BY 3.0), via [@audio-samples/piano-mp3](https://github.com/darosh/samples-piano-mp3). Os arquivos foram reduzidos para 9 s, 64 kbps.
- Exemplo do escritor: *Ode à Alegria* (Beethoven, domínio público), arranjada para este projeto.
