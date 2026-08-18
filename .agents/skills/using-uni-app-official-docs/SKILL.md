---
name: using-uni-app-official-docs
description: Use when implementing, reviewing, or diagnosing Vue 3 uni-app behavior, APIs, components, lifecycle, configuration, H5, App Android/iOS, or an explicitly requested uniCloud feature in this repository.
---

# Using uni-app Official Docs

Use repository code first and scoped DCloud documentation second. Never treat
`uni-app x`, UTS, UVue, HarmonyOS, or mini-program guidance as applicable to
this project.

## Workflow

1. Inspect the affected code, `package.json`, generated-config sources, and
   nearby project patterns before consulting documentation.
2. Refresh the local official sources when network access is available:

   ```bash
   node .agents/skills/using-uni-app-official-docs/scripts/sync-sources.mjs
   ```

   If refresh fails but an older atomic cache exists, disclose that it is
   stale before using it. The versioned cache switches through `current.json`,
   so a failed refresh leaves the prior version readable. Do not silently
   substitute web search or uni-app x.

3. Select exactly one source:
   - Use `uni-app` for this project's Vue 3 CLI/Vite frontend, H5, or App work.
   - Use `unicloud` only when the user explicitly asks about uniCloud or the
     repository contains actual uniCloud configuration or code.
4. Search through the filtering helper:

   ```bash
   node .agents/skills/using-uni-app-official-docs/scripts/search-docs.mjs --source uni-app "<query>"
   node .agents/skills/using-uni-app-official-docs/scripts/search-docs.mjs --source unicloud "<query>"
   ```

5. Open only the relevant matched Markdown file and section. For classic
   uni-app results, use only H5 and App Android/iOS rows or prose. Reject any
   section that is specifically about uni-app x, UTS, UVue, HarmonyOS, or a
   mini-program platform even if it appears in a shared document.
6. Apply this precedence when sources disagree:
   repository code/configuration → scoped official DCloud docs → existing
   project patterns/unibest → generic Vue, Vite, or Pinia guidance.
7. In the result, name the official repository, source-relative file path,
   and synchronized commit printed by the sync script. Distinguish official
   documentation from an inference based on project code.

## Source Boundaries

| Source                 | Remote and branch                     | Allowed content                                                 |
| ---------------------- | ------------------------------------- | --------------------------------------------------------------- |
| `uni-app`              | `dcloud/unidocs-zh`, `master`         | Traditional Vue 3 uni-app; H5 and App only                      |
| `uni-app` shared pages | `dcloud/docs-common`, `main`          | `unidocs-zh`'s declared shared-doc dependency; same exclusions  |
| `unicloud`             | `dcloud/uni-agent-knowledges`, `main` | `knowledges/unicloud` only and only on explicit demand/evidence |

These DCloud repositories are not themselves Agent Skills and must not be
installed with a skill installer. The knowledge repository's
`knowledges/uni-app-x` tree is excluded at sparse checkout rather than trusted
and filtered later.
