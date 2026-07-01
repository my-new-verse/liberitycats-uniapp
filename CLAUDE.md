@AGENTS.md

# CLAUDE.md

## Project

- **Name**: EasyUniapp2 / liberitycats-uniapp
- **Stack**: UniApp + Vue 3 + TypeScript + UnoCSS + wot-design-uni + Pinia
- **Platforms**: iOS/Android App (also supports H5, WeChat miniprogram)
- **Package manager**: pnpm (enforced via preinstall)

## Key Directories

- `src/pages/` — main pages: `about`, `callback`, `cats/*`, `demo`, `game`, `tabbar`, `test`
- `src/pages-sub/` — sub-package pages (`demo`)
- `src/service/api/` — backend API calls (NOT `src/api/`)
- `src/interceptors/` — request & route interceptors (`request.ts`, `route.ts`, `prototype.ts`, `index.ts`)
- `src/store/` — Pinia stores (`index.ts`, `user.ts`)
- `src/hooks/` — `useRequest.ts`, `useUpload.ts`
- `src/locale/` — i18n (`zh-Hans.json`, `zh-Hant.json`, `en.json`, `ja.json`)
- `src/utils/` — `http.ts`, `httpOut.ts`, `i18n.ts`, `platform.ts`, `index.ts`
- `src/layouts/` — `default.vue`, `default2.vue`, `demo.vue`
- `pages.config.ts` — convention-based routing config
- `manifest.config.ts` — UniApp manifest config

## Dev Commands

```bash
pnpm dev:h5          # H5 dev server (localhost)
pnpm dev:mp-weixin   # WeChat miniprogram → dist/dev/mp-weixin
pnpm dev:app         # App → dist/dev/app (import in HBuilderX)
pnpm build:app       # App production build (runs build-app.sh)
pnpm build:h5        # H5 production build → dist/build/h5
```

## Conventions

- API calls go in `src/service/api/` (one file per domain: `user.ts`, `login.ts`, `game.ts`, etc.)
- Routing: convention-based via `@uni-helper/vite-plugin-uni-pages`, configured in `pages.config.ts`
- State: Pinia with `pinia-plugin-persistedstate`
- i18n: `vue-i18n` + `src/locale/`
