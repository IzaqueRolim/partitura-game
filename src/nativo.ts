// Integração com o app nativo (Capacitor): botão "voltar" do Android e barra de status.
// No navegador comum este arquivo não faz nada.
import { Capacitor } from '@capacitor/core'

export async function iniciarNativo() {
  if (!Capacitor.isNativePlatform()) return
  const { App } = await import('@capacitor/app')
  // voltar: retorna à tela anterior; na trilha (tela inicial), fecha o app
  App.addListener('backButton', () => {
    const naInicial = !location.hash || location.hash === '#/' || location.hash === '#'
    if (naInicial) App.exitApp()
    else history.back()
  })
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Light })
    if (Capacitor.getPlatform() === 'android') await StatusBar.setBackgroundColor({ color: '#f7f7f5' })
  } catch {
    /* barra de status indisponível */
  }
}
