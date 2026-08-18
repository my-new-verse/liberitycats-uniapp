#!/usr/bin/env node

import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { DEFAULT_CACHE_DIR, readCurrentManifest } from './sync-sources.mjs'

const SOURCE_NAMES = ['uni-app', 'unicloud']

export function parseSearchArgs(args) {
  let source = 'uni-app'
  let maxResults = 80
  const queryParts = []

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]

    if (argument === '--source') {
      source = args[index + 1]
      index += 1
    }
    else if (argument === '--max-results') {
      maxResults = Number.parseInt(args[index + 1], 10)
      index += 1
    }
    else {
      queryParts.push(argument)
    }
  }

  if (!SOURCE_NAMES.includes(source))
    throw new Error('Source must be one of: uni-app, unicloud')
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 500)
    throw new Error('max-results must be an integer from 1 to 500')

  const query = queryParts.join(' ').trim()
  if (!query)
    throw new Error('Query is required')

  return { maxResults, query, source }
}

export function isExcludedUniAppPath(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/').toLowerCase()

  return (
    /uni(?:-app(?:[-\s]?x)|appx)/.test(normalized)
    || /harmony/.test(normalized)
    || /mini-?program|miniprogram/.test(normalized)
    || /(^|\/)(mp-[^/]+|quickapp[^/]*)(\/|$)/.test(normalized)
    || /unicloud/.test(normalized)
    || /uts(?:sdk|ios|android|plugin)/.test(normalized)
    || /(^|[\/\-_.])(uts|uvue)([\/\-_.]|$)/.test(normalized)
  )
}

export function isExcludedUniAppLine(line) {
  return (
    /uni(?:-app(?:[-\s]?x)|appx)/i.test(line)
    || /uts(?:sdk|ios|android|plugin)/i.test(line)
    || /(^|[^A-Za-z])uts(?:[^a-z]|$)|UTS[A-Z]/.test(line)
    || /\.uvue\b|(^|\W)uvue(\W|$)/i.test(line)
    || /harmony|鸿蒙/i.test(line)
    || /mini-?program|小程序|mp-weixin|mp-alipay/i.test(line)
    || /unicloud/i.test(line)
  )
}

async function listMarkdownFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.name === '.git')
      continue

    const target = path.join(current, entry.name)
    if (entry.isDirectory())
      files.push(...(await listMarkdownFiles(root, target)))
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
      files.push(target)
  }

  return files.sort()
}

function pathRelevance(relativePath, terms) {
  const normalized = relativePath.replaceAll('\\', '/').toLowerCase()
  let score = 0
  const isConditionalCompilationQuery = terms.some(term => (
    /条件编译|ifdef|ifndef|app-plus/.test(term)
  ))
  const isLifecycleQuery = terms.some(term => (
    /生命周期|lifecycle|onload|onshow|onunload|onready/.test(term)
  ))

  if (normalized.endsWith('tutorial/platform.md') && isConditionalCompilationQuery)
    score += 30
  else if (normalized.endsWith('tutorial/page.md') && isLifecycleQuery)
    score += 30
  else if (normalized.includes('/tutorial/') || normalized.startsWith('tutorial/'))
    score += 8
  else if (normalized.includes('/api/') || normalized.startsWith('api/'))
    score += 6

  if (/(^|\/)release(?:-note)?(?:-archive)?\.md$/.test(normalized))
    score -= 30
  if (normalized.endsWith('/readme.md') || normalized === 'readme.md')
    score -= 4

  return score
}

async function collectCandidates({ prefix = '', query, root, source }) {
  const files = await listMarkdownFiles(root)
  const needle = query.toLocaleLowerCase()
  const terms = [...new Set(needle.split(/\s+/).filter(Boolean))]
  const candidates = []

  for (const filePath of files) {
    const relativePath = path.relative(root, filePath).replaceAll('\\', '/')
    if (source === 'uni-app' && isExcludedUniAppPath(relativePath))
      continue

    const lines = (await readFile(filePath, 'utf8')).split(/\r?\n/)
    for (let index = 0; index < lines.length; index += 1) {
      const text = lines[index].trim()
      const normalizedText = text.toLocaleLowerCase()
      const matchedTerms = terms.filter(term => normalizedText.includes(term))
      if (matchedTerms.length === 0)
        continue
      if (source === 'uni-app' && isExcludedUniAppLine(text))
        continue

      const displayPath = prefix ? `${prefix}/${relativePath}` : relativePath
      candidates.push({
        file: displayPath,
        line: index + 1,
        score: (
          matchedTerms.length * 10
          + (normalizedText.includes(needle) ? 100 : 0)
          + pathRelevance(displayPath, terms)
        ),
        text,
      })
    }
  }

  return candidates
}

function rankCandidates(candidates, maxResults) {
  return candidates
    .sort((left, right) => (
      right.score - left.score
      || left.text.localeCompare(right.text)
      || left.file.localeCompare(right.file)
      || left.line - right.line
    ))
    .slice(0, maxResults)
    .map(({ score: _score, ...match }) => match)
}

export async function collectMatches({ root, query, source, maxResults }) {
  return rankCandidates(
    await collectCandidates({ query, root, source }),
    maxResults,
  )
}

export async function collectMatchesFromRoots({
  maxResults,
  query,
  roots,
  source,
}) {
  const candidateGroups = await Promise.all(
    roots.map(({ prefix, root }) => collectCandidates({ prefix, query, root, source })),
  )

  return rankCandidates(candidateGroups.flat(), maxResults)
}

async function assertDirectoryExists(target) {
  try {
    const details = await stat(target)
    if (details.isDirectory())
      return
  }
  catch (error) {
    if (error.code !== 'ENOENT')
      throw error
  }

  throw new Error(`Official knowledge source directory is missing: ${target}`)
}

export async function resolveSourceRoots(cacheDir, source) {
  let manifest
  try {
    manifest = await readCurrentManifest(cacheDir)
  }
  catch (error) {
    throw new Error(
      `${error.message}. Run: node .agents/skills/using-uni-app-official-docs/scripts/sync-sources.mjs`,
    )
  }

  const versionRoot = path.join(cacheDir, 'versions', manifest.version)
  const roots = source === 'uni-app'
    ? [
        {
          prefix: 'unidocs-zh/docs',
          root: path.join(versionRoot, 'unidocs-zh', 'docs'),
        },
        {
          prefix: 'docs-common',
          root: path.join(versionRoot, 'docs-common'),
        },
      ]
    : [
        {
          prefix: 'uni-agent-knowledges/knowledges/unicloud',
          root: path.join(
            versionRoot,
            'uni-agent-knowledges',
            'knowledges',
            'unicloud',
          ),
        },
      ]

  for (const { root } of roots)
    await assertDirectoryExists(root)

  return roots
}

async function main() {
  const options = parseSearchArgs(process.argv.slice(2))
  const cacheDir = process.env.UNI_APP_KNOWLEDGE_CACHE_DIR || DEFAULT_CACHE_DIR
  const roots = await resolveSourceRoots(cacheDir, options.source)
  const matches = await collectMatchesFromRoots({ ...options, roots })

  if (matches.length === 0) {
    console.log(`No in-scope ${options.source} matches found for: ${options.query}`)
    return
  }

  for (const match of matches)
    console.log(`${match.file}:${match.line}:${match.text}`)
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
