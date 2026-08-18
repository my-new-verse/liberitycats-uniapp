#!/usr/bin/env node

import { execFile } from 'node:child_process'
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '../../../..')
const CACHE_MARKER = 'uni-app-official-docs-cache-v1\n'
const LEGACY_SOURCE_DIRS = new Set(['docs-common', 'uni-agent-knowledges', 'unidocs-zh'])

export const DEFAULT_CACHE_DIR = path.join(repoRoot, '.agent-knowledge', 'dcloud')
export const DEFAULT_UNI_APP_REPO = 'https://gitcode.com/dcloud/unidocs-zh.git'
export const DEFAULT_DOCS_COMMON_REPO = 'https://gitcode.com/dcloud/docs-common.git'
export const DEFAULT_KNOWLEDGE_REPO =
  'https://gitcode.com/dcloud/uni-agent-knowledges.git'

async function pathExists(target) {
  try {
    await stat(target)
    return true
  }
  catch (error) {
    if (error.code === 'ENOENT')
      return false
    throw error
  }
}

async function runGit(gitBin, args, cwd) {
  try {
    return await execFileAsync(gitBin, args, {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
    })
  }
  catch (error) {
    if (error.code === 'ENOENT')
      throw new Error(`Git executable was not found: ${gitBin}`)

    const detail = error.stderr?.trim() || error.stdout?.trim() || error.message
    throw new Error(`git ${args[0]} failed: ${detail}`)
  }
}

function isWithin(parent, target) {
  const relative = path.relative(parent, target)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function assertSafeCacheDirectory(cacheDir) {
  const resolved = path.resolve(cacheDir)
  const projectCacheRoot = path.join(repoRoot, '.agent-knowledge')
  const temporaryRoot = path.resolve(os.tmpdir())
  const isDedicatedName = path.basename(resolved) === 'dcloud'
  const isAllowedParent = (
    isWithin(projectCacheRoot, resolved)
    || isWithin(temporaryRoot, resolved)
  )

  if (!isDedicatedName || !isAllowedParent) {
    throw new Error(
      `Refusing cache target outside a dedicated DCloud cache directory: ${resolved}`,
    )
  }
}

async function prepareCacheRoot(cacheDir) {
  if (!(await pathExists(cacheDir))) {
    await mkdir(cacheDir, { recursive: true })
    await writeFile(path.join(cacheDir, '.cache-marker'), CACHE_MARKER)
    return []
  }

  const entries = await readdir(cacheDir)
  if (entries.length === 0) {
    await writeFile(path.join(cacheDir, '.cache-marker'), CACHE_MARKER)
    return []
  }

  const markerPath = path.join(cacheDir, '.cache-marker')
  if (await pathExists(markerPath)) {
    const marker = await readFile(markerPath, 'utf8')
    if (marker !== CACHE_MARKER)
      throw new Error(`Cache marker is invalid at ${markerPath}`)
    return []
  }

  const isRecognizedLegacyCache = entries.every(entry => LEGACY_SOURCE_DIRS.has(entry))
  if (!isRecognizedLegacyCache) {
    throw new Error(
      `Existing directory is not a recognized uni-app official docs cache: ${cacheDir}`,
    )
  }

  await writeFile(markerPath, CACHE_MARKER)
  return entries
}

async function cloneSparse({
  branch,
  destination,
  gitBin,
  name,
  repository,
  sparsePaths,
}) {
  await runGit(gitBin, [
    'clone',
    '--depth',
    '1',
    '--branch',
    branch,
    '--filter=blob:none',
    '--sparse',
    repository,
    destination,
  ])
  await runGit(gitBin, ['sparse-checkout', 'set', ...sparsePaths], destination)
  const { stdout } = await runGit(gitBin, ['rev-parse', 'HEAD'], destination)

  return {
    branch,
    commit: stdout.trim(),
    name,
    path: destination,
    repository,
  }
}

async function publishCurrentManifest(cacheDir, version, results) {
  const manifestPath = path.join(cacheDir, 'current.json')
  const temporaryManifestPath = path.join(
    cacheDir,
    `.current-${process.pid}-${Date.now()}.json`,
  )
  const manifest = {
    createdAt: new Date().toISOString(),
    sources: results.map(({ branch, commit, name, repository }) => ({
      branch,
      commit,
      name,
      repository,
    })),
    version,
  }

  await writeFile(temporaryManifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  await rename(temporaryManifestPath, manifestPath)
  return manifest
}

async function cleanOldVersions(cacheDir, currentVersion) {
  const versionsDir = path.join(cacheDir, 'versions')
  const versions = (await readdir(versionsDir)).sort().reverse()
  const versionsToKeep = new Set([currentVersion, ...versions.slice(0, 2)])

  for (const version of versions) {
    if (!versionsToKeep.has(version))
      await rm(path.join(versionsDir, version), { force: true, recursive: true })
  }
}

async function cleanupPublishedCache({ cacheDir, currentVersion, legacyDirs }) {
  await cleanOldVersions(cacheDir, currentVersion)
  for (const legacyDir of legacyDirs)
    await rm(path.join(cacheDir, legacyDir), { force: true, recursive: true })
}

export async function readCurrentManifest(cacheDir = DEFAULT_CACHE_DIR) {
  const markerPath = path.join(cacheDir, '.cache-marker')
  const manifestPath = path.join(cacheDir, 'current.json')

  if (!(await pathExists(markerPath)) || (await readFile(markerPath, 'utf8')) !== CACHE_MARKER) {
    throw new Error(`Official knowledge cache is not initialized at ${cacheDir}`)
  }

  let manifest
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  }
  catch (error) {
    throw new Error(`Official knowledge cache has no valid current version at ${cacheDir}: ${error.message}`)
  }

  const versionDir = path.join(cacheDir, 'versions', manifest.version)
  if (!(await pathExists(versionDir)))
    throw new Error(`Official knowledge cache version is missing: ${versionDir}`)

  return manifest
}

export async function syncSources({
  cacheDir = process.env.UNI_APP_KNOWLEDGE_CACHE_DIR || DEFAULT_CACHE_DIR,
  cleanup = cleanupPublishedCache,
  docsCommonRepo = process.env.UNI_APP_DOCS_COMMON_REPO || DEFAULT_DOCS_COMMON_REPO,
  gitBin = process.env.UNI_APP_KNOWLEDGE_GIT_BIN || 'git',
  knowledgeRepo =
    process.env.UNI_AGENT_KNOWLEDGES_REPO || DEFAULT_KNOWLEDGE_REPO,
  uniAppRepo = process.env.UNI_APP_DOCS_REPO || DEFAULT_UNI_APP_REPO,
} = {}) {
  assertSafeCacheDirectory(cacheDir)

  const resolvedCacheDir = path.resolve(cacheDir)
  const legacyDirs = await prepareCacheRoot(resolvedCacheDir)
  const versionsDir = path.join(resolvedCacheDir, 'versions')
  const version = `${Date.now()}-${process.pid}-${Math.random().toString(16).slice(2)}`
  const versionDir = path.join(versionsDir, version)

  await mkdir(versionDir, { recursive: true })

  const results = []
  try {
    results.push(
      await cloneSparse({
        gitBin,
        name: 'unidocs-zh',
        repository: uniAppRepo,
        branch: 'master',
        sparsePaths: ['docs'],
        destination: path.join(versionDir, 'unidocs-zh'),
      }),
    )
    results.push(
      await cloneSparse({
        gitBin,
        name: 'docs-common',
        repository: docsCommonRepo,
        branch: 'main',
        sparsePaths: [
          'tutorial',
          'collocation',
          'worktile',
          'plugin',
          'uni-publish',
          'uni-push',
        ],
        destination: path.join(versionDir, 'docs-common'),
      }),
    )
    results.push(
      await cloneSparse({
        gitBin,
        name: 'uni-agent-knowledges',
        repository: knowledgeRepo,
        branch: 'main',
        sparsePaths: ['knowledges/unicloud'],
        destination: path.join(versionDir, 'uni-agent-knowledges'),
      }),
    )

    await publishCurrentManifest(resolvedCacheDir, version, results)
  }
  catch (error) {
    await rm(versionDir, { force: true, recursive: true })
    throw new Error(`Failed to synchronize official DCloud knowledge sources: ${error.message}`)
  }

  const warnings = []
  try {
    await cleanup({
      cacheDir: resolvedCacheDir,
      currentVersion: version,
      legacyDirs,
    })
  }
  catch (error) {
    warnings.push(`Post-publication cleanup failed: ${error.message}`)
  }

  Object.defineProperty(results, 'warnings', {
    enumerable: false,
    value: warnings,
  })
  return results
}

async function main() {
  const results = await syncSources()

  for (const result of results) {
    console.log(`${result.repository}#${result.branch}`)
    console.log(`  commit: ${result.commit}`)
    console.log(`  path: ${result.path}`)
  }
  for (const warning of results.warnings)
    console.warn(`warning: ${warning}`)
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
