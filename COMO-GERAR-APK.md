# Como gerar o APK do Partitura (celular e tablet Android)

O **mesmo APK** funciona em celulares e tablets Android 7.0 ou mais novos.
O layout se adapta ao tamanho da tela e à rotação, e o app funciona **sem internet**: os sons do piano e as partituras ficam dentro do APK.

Existem dois caminhos. O **A** não exige instalar nada no computador.

---

## A) Pelo GitHub (recomendado)

O projeto já tem o arquivo `.github/workflows/android.yml`, que gera o APK automaticamente na nuvem.

1. Crie um repositório no GitHub (pode ser privado).
2. No terminal, dentro da pasta do projeto:

   ```bash
   git init
   git add .
   git commit -m "Partitura"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/partitura.git
   git push -u origin main
   ```

3. No GitHub, abra a aba **Actions**. A execução **"Gerar APK Android"** começa sozinha e leva cerca de 5 a 8 minutos.
   Para gerar de novo sem mudar o código: *Actions → Gerar APK Android → Run workflow*.
4. Quando terminar (sinal verde), clique na execução. Em **Artifacts**, baixe **partitura-apk-debug**: é um `.zip` com o `app-debug.apk` dentro.
5. Instale no aparelho (veja "Instalar no celular ou tablet" abaixo).

A cada `git push` na `main`, um APK novo é gerado com número de versão maior. Assim, ele instala por cima do anterior sem perder o progresso.

---

## B) No seu computador, com o Android Studio

### Instalar uma vez

- **Node.js 22** — https://nodejs.org
- **Android Studio** — https://developer.android.com/studio (já traz o Java 21 e o Android SDK).
  Na primeira abertura, aceite a instalação padrão do SDK.

### Gerar o APK

```bash
npm install
npm run android:abrir        # gera o site, copia para o projeto Android e abre o Android Studio
```

No Android Studio: **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
Ao terminar, clique em **locate** no aviso. O arquivo fica em `android/app/build/outputs/apk/debug/app-debug.apk`.

Também dá para gerar só pelo terminal, sem abrir o Android Studio (ele precisa estar instalado):

```bash
npm run android:apk              # macOS / Linux
npm run android:apk:windows      # Windows
```

Para testar direto num aparelho: ative o **modo desenvolvedor** e a **depuração USB** no celular, conecte o cabo e clique em ▶ **Run** no Android Studio.

---

## Instalar no celular ou tablet

1. Envie o `app-debug.apk` para o aparelho (cabo USB, Google Drive, WhatsApp, e-mail…).
2. Toque no arquivo. O Android vai pedir para **permitir a instalação de apps desta fonte** (Configurações → Apps → Acesso especial → Instalar apps desconhecidos). Permita para o app que você usou para abrir o arquivo.
3. Toque em **Instalar**. O ícone **Partitura** aparece na tela inicial.

Pelo computador, com o aparelho conectado: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`

---

## Versão de produção (assinada) e Google Play

O APK de teste (*debug*) serve para usar e distribuir entre conhecidos. Para publicar na **Play Store**, gere uma versão assinada:

1. Crie a chave de assinatura (uma única vez, e **guarde o arquivo e as senhas**: sem eles não dá para atualizar o app na loja):

   ```bash
   keytool -genkeypair -v -keystore partitura.jks -alias partitura -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Pelo GitHub:** em *Settings → Secrets and variables → Actions*, crie os secrets:
   - `ANDROID_KEYSTORE_BASE64`: o conteúdo de `base64 -w0 partitura.jks` (no Windows: `certutil -encode partitura.jks saida.txt`, sem as linhas BEGIN/END)
   - `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`partitura`) e `ANDROID_KEY_PASSWORD`

   Na próxima execução aparece o artifact **partitura-producao**, com o APK assinado e o **AAB** (o formato que a Play Store pede).

3. **No computador:** adicione em `~/.gradle/gradle.properties`:

   ```
   PARTITURA_KEYSTORE=/caminho/para/partitura.jks
   PARTITURA_KEYSTORE_PASSWORD=...
   PARTITURA_KEY_ALIAS=partitura
   PARTITURA_KEY_PASSWORD=...
   ```

   e rode `npm run android:release`.

A conta de desenvolvedor do Google Play tem taxa única de US$ 25.

---

## iPhone e iPad

O projeto também pode virar app iOS (`npx cap add ios`), mas isso exige um **Mac com Xcode** e, para instalar fora do modo de teste, uma conta Apple Developer (US$ 99/ano).

---

## Observações

- **Identificador do app:** `br.ufam.partitura` (em `capacitor.config.ts` e `android/app/build.gradle`). Se for publicar com outro nome, troque antes da primeira publicação.
- **Ícone e tela de abertura:** ficam em `assets/`. Depois de trocar as imagens, rode `npx @capacitor/assets generate --android`.
- **Teclado MIDI:** funciona no navegador Chrome do Android, mas não dentro do app instalado, porque o WebView do Android não oferece Web MIDI. O teclado na tela funciona normalmente.
- **Botão voltar do Android:** volta para a tela anterior; na tela inicial (Trilha), fecha o app.
- **Progresso salvo:** fica no aparelho. Desinstalar o app apaga o progresso; atualizar mantém.
