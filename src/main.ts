import './polyfills'
import { createSSRApp } from 'vue'
import App from './App.vue'
import store from './store'
import i18n from './locale/index'
import { routeInterceptor, requestInterceptor, prototypeInterceptor } from './interceptors'
import { installVConsoleForApp } from './utils/svconsole'
import 'virtual:uno.css'
import '@/style/index.scss'

export function createApp() {
  const app = createSSRApp(App)
  app.use(store)
  app.use(i18n)
  app.use(routeInterceptor)
  app.use(requestInterceptor)
  app.use(prototypeInterceptor)
  // #ifdef APP-PLUS
  installVConsoleForApp(app)
  // #endif
  return {
    app,
  }
}
