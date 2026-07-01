# AGENTS.md

## Project Purpose

This is a uni-app cross-platform frontend project built with Vue 3, TypeScript, Vite, Pinia, UnoCSS, SCSS, and modern uni-app tooling.

Agents must preserve compatibility across the platforms this project targets, especially H5, mini programs, and App builds. Treat uni-app runtime behavior as the boundary for architectural decisions: a solution that works in a browser only is not complete unless it is guarded or intentionally scoped to H5.

## Source Of Truth And Precedence

1. The current repository configuration and code are the source of truth.
2. uni-app platform constraints take precedence over generic Vue, Vite, or browser assumptions.
3. Existing project patterns take precedence over new abstractions or external preferences.
4. The [feige996/unibest](https://github.com/feige996/unibest) repository is the primary concrete reference for uni-app project structure, workflow, Vue TypeScript patterns, API conventions, styling conventions, and platform handling.
5. The [antfu/skills](https://github.com/antfu/skills) repository is an external skill reference only. Do not copy its detailed rules into this project or treat them as embedded project rules.
6. When references conflict, prefer this repository's actual `package.json`, config files, runtime constraints, and established code style.

## Required External Skills

Developers and agents should install or make available [antfu/skills](https://github.com/antfu/skills):

```bash
pnpx skills add antfu/skills --skill='*'
```

This installs skills into `.agents/skills/` only. Claude Code, Codex, and Cursor each read their own skill directory (`.claude/skills/`, `.codex/skills/`, `.cursor/skills/` respectively) and do not look inside `.agents/skills/`. After installing or updating skills, link `.agents/skills/` into whichever tool directories are in use, for example:

```bash
ln -s ../.agents/skills .claude/skills
ln -s ../.agents/skills .codex/skills
ln -s ../.agents/skills .cursor/skills
```

Then reload skills in the running tool (e.g. restart the session or re-run its skill discovery) so the linked skills are picked up.

Consult these skills when relevant, but do not paste their detailed contents into this file:

- [`skills/vue`](https://github.com/antfu/skills/tree/main/skills/vue)
- [`skills/vue-best-practices`](https://github.com/antfu/skills/tree/main/skills/vue-best-practices)
- [`skills/pinia`](https://github.com/antfu/skills/tree/main/skills/pinia)
- [`skills/vite`](https://github.com/antfu/skills/tree/main/skills/vite)
- [`skills/vitest`](https://github.com/antfu/skills/tree/main/skills/vitest)
- [`skills/antfu`](https://github.com/antfu/skills/tree/main/skills/antfu)

Use those skills for general Vue, Vite, Pinia, Vitest, and TypeScript guidance. Apply them only after checking this repository's actual patterns.

## Project Structure

Use the current repository layout first. unibest is the reference model, but this project has its own naming:

- `src/pages/`: main uni-app pages.
- `src/pages-sub/`: subpackage pages.
- `src/components/`: reusable global or feature components.
- `src/pages/**/components/`: page-local components when a component is not reusable outside that page area.
- `src/layouts/`: layout components used by the uni-app layout plugin.
- `src/service/api/`: domain API clients. Add new API wrappers by domain here.
- `src/interceptors/`: request, route, and prototype interceptors.
- `src/store/`: Pinia stores and store setup.
- `src/hooks/`: reusable composables auto-imported by Vite.
- `src/utils/`: shared utilities.
- `src/types/`: generated and hand-written shared types.
- `src/static/`: static assets.
- `src/style/`: global SCSS, icon font styles, and feature-level shared styles.
- `src/locale/`: i18n resources.
- `src/nativeResources/`: native App resources.
- `pages.config.ts`: route, global style, easycom, and tab bar configuration.
- `manifest.config.ts`: generated manifest source.
- `src/pages.json`, `src/manifest.json`, `src/types/auto-import.d.ts`, and `src/types/uni-pages.d.ts`: generated or tool-managed files. Do not edit them manually unless the project explicitly requires it.

## Development Commands

Use pnpm. Do not change package manager without explicit instruction.

Commands currently present in this repository's `package.json`:

```bash
pnpm install
pnpm dev
pnpm dev:h5
pnpm dev:mp
pnpm dev:mp-weixin
pnpm dev:mp-alipay
pnpm dev:app
pnpm dev:app-android
pnpm dev:app-ios
pnpm build
pnpm build:h5
pnpm build:mp
pnpm build:mp-weixin
pnpm build:mp-alipay
pnpm build:app
pnpm build:app-android
pnpm build:app-ios
pnpm type-check
pnpm cz
```

This checkout does not currently expose `lint`, `lint:fix`, `test`, or `test:run` scripts. unibest has those scripts in newer references, but agents must not claim they exist here unless `package.json` is updated.

## Validation Before Completion

Before claiming a task is complete:

- Run `pnpm type-check` for TypeScript or Vue changes when feasible.
- Run the relevant build command for platform-sensitive changes, for example `pnpm build:h5`, `pnpm build:mp`, or `pnpm build:app`.
- If a branch adds real lint or test scripts, run the exact script names from `package.json`.
- For App-specific changes, check `APP-PLUS` branches and report whether device or HBuilderX validation was performed.
- For mini program changes, check conditional compilation and report whether a mini program build was run.
- If validation cannot be run, state why and list the commands or platforms that were not verified.

Documentation-only changes do not require app builds, but still require reading the changed file before finishing.

## Vue 3 And TypeScript Conventions

- Use `<script setup lang="ts">` for Vue SFCs.
- Use the Composition API.
- Keep SFC section order consistent with the project and unibest guidance: script, template, then style.
- Prefer explicit types for props, emits, API payloads, API responses, and store state.
- Avoid `any` unless the surrounding code already uses it or there is a documented reason.
- Use `import type` for type-only imports.
- Prefer `interface` for object-shaped payloads and `type` for unions or aliases.
- Keep components small and focused.
- Move reusable stateful logic into `src/hooks/` or a focused composable near the feature.
- Keep page files as orchestration surfaces when a feature grows; move substantial reusable UI into components.
- Use the existing `@` alias for imports. Do not introduce new aliases without updating Vite and TypeScript config together.

## uni-app Conventions

- Use uni-app APIs such as `uni.request`, `uni.navigateTo`, `uni.showToast`, and page lifecycle hooks instead of browser-only APIs.
- Guard browser-only APIs with platform checks or conditional compilation.
- Preserve conditional compilation blocks such as `#ifdef H5`, `#ifdef APP-PLUS`, and `#ifndef H5`.
- Keep H5, mini program, and App behavior separate when their runtime APIs differ.
- Define page route metadata in page route blocks or `pages.config.ts` according to the existing pattern.
- Do not manually edit generated page or manifest output when the source config is available.
- Respect `easycom` usage for Wot Design Uni and z-paging components.
- Test or at least inspect platform-specific branches before changing navigation, payment, webview, media, native-resource, or request behavior.

## State Management

- Use Pinia stores in `src/store/`.
- Keep stores focused by domain.
- Prefer local component state when state does not need to survive navigation or be shared.
- Use setup stores when following the current project pattern.
- Preserve persisted state behavior configured through `pinia-plugin-persistedstate` and `uni.getStorageSync` / `uni.setStorageSync`.
- Do not add new global state just to pass data between a parent and child component.
- Consult the external Pinia skill for general best practices when changing store architecture.

## API And HTTP Patterns

- Add API clients under `src/service/api/`, organized by domain.
- Reuse the existing HTTP wrapper from `@/utils/http`; do not create parallel request utilities.
- Keep request and response types close to the API wrapper unless there is a shared domain type in `src/types/`.
- Preserve the interceptor flow in `src/interceptors/request.ts`, including base URL handling, token headers, environment headers, version headers, and trace headers.
- For internal API paths, use the existing relative `/v1/...` style and let the interceptor apply the base URL.
- Mark external requests through the existing custom request options instead of bypassing interceptors ad hoc.
- Keep error handling consistent with existing `http` behavior and page-level UX.
- Avoid silently changing API contracts. If backend fields change, update the typed interfaces and every caller that consumes those fields.

## Styling Conventions

- Use the existing UnoCSS and SCSS setup.
- Prefer utility classes for layout and common styling when they are already used in the surrounding file.
- Use scoped `lang="scss"` styles for component-specific CSS.
- Put shared global styles under `src/style/`.
- Keep mini program limitations in mind. The UnoCSS config uses applet presets for mini program platforms and different presets for non-mini-program platforms.
- Prefer `rpx` for cross-device uni-app sizing where appropriate.
- Do not introduce a new styling system without a strong reason and explicit approval.
- Avoid broad visual rewrites when the task is a targeted behavior or data change.

## File Editing Rules

- Read existing code before editing.
- Prefer minimal, targeted changes.
- Do not reformat unrelated files.
- Do not perform large unrelated refactors.
- Do not manually rewrite generated files.
- Do not change package manager, dependency strategy, or project structure without explicit instruction.
- Do not add dependencies unless necessary, justified, and consistent with the current stack.
- Preserve platform-specific code paths and comments when they encode runtime differences.
- Keep code comments useful and short. Explain non-obvious intent, not obvious mechanics.

## Agent Workflow

1. Identify the exact feature, page, API, store, or platform involved.
2. Inspect the current implementation and nearby patterns before choosing an approach.
3. Check `package.json` and config files instead of assuming unibest defaults.
4. Make the smallest change that satisfies the request.
5. Update types, stores, API wrappers, docs, and examples when behavior changes.
6. Validate with the appropriate existing scripts and platform builds.
7. Report what changed, what was verified, and what could not be verified.

When changing architecture, explain the tradeoffs and why the new boundary fits this project better than the previous one.

## PR And Commit Expectations

- Keep changes scoped to the requested behavior.
- Prefer conventional commit style if the surrounding history uses it.
- Mention validation commands and their results.
- Mention platform impact for H5, mini program, and App when relevant.
- Call out generated files separately if they changed.
- Do not mix unrelated cleanup with feature work.
