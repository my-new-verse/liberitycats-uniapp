import { createSessionDebugGate } from './svconsole-session.mjs'

// #ifdef APP-PLUS
import vConsole, { installVConsole } from '@/uni_modules/s-vconsole/js_sdk/s-vconsole'
// #endif

// Test builds start with the panel visible; production builds require the
// about-page gesture and remain enabled only for the current app process.
const isTestBuild = import.meta.env.VITE_MODE === 'development'

const debugGate = createSessionDebugGate(isTestBuild, () => {
  // #ifdef APP-PLUS
  installVConsole()
  // #endif
})

export function installVConsoleForApp(app: any) {
  // #ifdef APP-PLUS
  app.use(vConsole, {
    enabled: debugGate.isEnabled,
    webviewScope: 'shared',
    captureStorage: false,
    persistSwitchPosition: false,
    // Ignore any launcher visibility saved by an older build. The session
    // gesture must be able to show the launcher without writing storage.
    persistLauncherVisibility: false,
    sharedWebview: {
      showLauncher: true,
      // A tester may move it during this app session; the position is not saved.
      draggable: true,
      longPressToHide: false,
      // The plugin additionally accounts for the device bottom safe-area.
      // 50px tab bar + 14px visual gap keeps the 82x36 launcher clear.
      right: 16,
      bottom: 64,
    },
  })
  // #endif
}

export function enableVConsoleForSession() {
  return debugGate.enableForSession()
}
