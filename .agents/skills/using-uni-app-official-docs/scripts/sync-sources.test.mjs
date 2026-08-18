import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

import { readCurrentManifest, syncSources } from './sync-sources.mjs'

const execFileAsync = promisify(execFile)

async function createRepository(root, files, branch) {
  await mkdir(root, { recursive: true })
  await execFileAsync('git', ['init', '--initial-branch', branch], { cwd: root })
  await execFileAsync('git', ['config', 'user.email', 'tests@example.com'], { cwd: root })
  await execFileAsync('git', ['config', 'user.name', 'Tests'], { cwd: root })

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(root, relativePath)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, contents)
  }

  await execFileAsync('git', ['add', '.'], { cwd: root })
  await execFileAsync('git', ['commit', '-m', 'fixture'], { cwd: root })
}

test('installs official sources, updates to latest, and checks out only uniCloud knowledge', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'uni-app-sync-'))
  const uniAppRepo = path.join(temp, 'unidocs-zh')
  const docsCommonRepo = path.join(temp, 'docs-common')
  const knowledgeRepo = path.join(temp, 'uni-agent-knowledges')
  const cacheDir = path.join(temp, 'cache', 'dcloud')

  await createRepository(
    uniAppRepo,
    {
      'docs/api/request.md': 'classic uni-app',
      'docs/uni-app-x/api/request.md': 'uni-app x',
    },
    'master',
  )
  await createRepository(
    docsCommonRepo,
    {
      'tutorial/platform.md': 'conditional compilation for H5 and APP-PLUS',
      'tutorial/app-harmony.md': 'Harmony',
      'worktile/auto/uniapp-cli-project.md': 'CLI project guide',
    },
    'main',
  )
  await createRepository(
    knowledgeRepo,
    {
      'knowledges/unicloud/docs/database.md': 'uniCloud',
      'knowledges/uni-app-x/docs/api/request.md': 'uni-app x',
    },
    'main',
  )

  const first = await syncSources({
    cacheDir,
    docsCommonRepo,
    uniAppRepo,
    knowledgeRepo,
  })

  await writeFile(path.join(uniAppRepo, 'docs', 'api', 'request.md'), 'updated classic uni-app')
  await execFileAsync('git', ['add', '.'], { cwd: uniAppRepo })
  await execFileAsync('git', ['commit', '-m', 'update fixture'], { cwd: uniAppRepo })

  const second = await syncSources({
    cacheDir,
    docsCommonRepo,
    uniAppRepo,
    knowledgeRepo,
  })

  assert.equal(first.length, 3)
  assert.equal(second.length, 3)
  assert.notEqual(
    first.find(source => source.name === 'unidocs-zh').commit,
    second.find(source => source.name === 'unidocs-zh').commit,
  )
  assert.equal(
    await readFile(
      path.join(second.find(source => source.name === 'unidocs-zh').path, 'docs', 'api', 'request.md'),
      'utf8',
    ),
    'updated classic uni-app',
  )
  assert.equal(
    await readFile(
      path.join(second.find(source => source.name === 'docs-common').path, 'tutorial', 'platform.md'),
      'utf8',
    ),
    'conditional compilation for H5 and APP-PLUS',
  )
  assert.equal(
    await readFile(
      path.join(
        second.find(source => source.name === 'docs-common').path,
        'worktile',
        'auto',
        'uniapp-cli-project.md',
      ),
      'utf8',
    ),
    'CLI project guide',
  )
  assert.equal(
    await readFile(
      path.join(
        second.find(source => source.name === 'uni-agent-knowledges').path,
        'knowledges',
        'unicloud',
        'docs',
        'database.md',
      ),
      'utf8',
    ),
    'uniCloud',
  )
  await assert.rejects(
    readFile(
      path.join(
        second.find(source => source.name === 'uni-agent-knowledges').path,
        'knowledges',
        'uni-app-x',
        'docs',
        'api',
        'request.md',
      ),
      'utf8',
    ),
    /ENOENT/,
  )
  assert.equal((await readdir(path.join(cacheDir, 'versions'))).length, 2)
})

test('preserves the existing cache when a source cannot be cloned', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'uni-app-sync-failure-'))
  const cacheDir = path.join(temp, 'cache', 'dcloud')
  const uniAppRepo = path.join(temp, 'unidocs-zh')
  const docsCommonRepo = path.join(temp, 'docs-common')
  const knowledgeRepo = path.join(temp, 'uni-agent-knowledges')

  await createRepository(uniAppRepo, { 'docs/api/request.md': 'classic' }, 'master')
  await createRepository(docsCommonRepo, { 'tutorial/platform.md': 'platform' }, 'main')
  await createRepository(
    knowledgeRepo,
    { 'knowledges/unicloud/docs/jql.md': 'JQL' },
    'main',
  )

  await syncSources({ cacheDir, docsCommonRepo, knowledgeRepo, uniAppRepo })
  const before = await readCurrentManifest(cacheDir)

  await assert.rejects(
    syncSources({
      cacheDir,
      docsCommonRepo,
      uniAppRepo: path.join(temp, 'missing-unidocs'),
      knowledgeRepo,
    }),
    /failed to synchronize/i,
  )
  assert.deepEqual(await readCurrentManifest(cacheDir), before)
})

test('refuses to overwrite an unrecognized non-empty cache directory', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'uni-app-sync-corrupt-'))
  const cacheDir = path.join(temp, 'cache', 'dcloud')
  await mkdir(cacheDir, { recursive: true })
  await writeFile(path.join(cacheDir, 'sentinel.txt'), 'keep me')

  await assert.rejects(
    syncSources({
      cacheDir,
      docsCommonRepo: '/missing',
      uniAppRepo: '/missing',
      knowledgeRepo: '/missing',
    }),
    /not a recognized uni-app official docs cache/i,
  )
  assert.equal(await readFile(path.join(cacheDir, 'sentinel.txt'), 'utf8'), 'keep me')
})

test('reports a missing Git executable clearly', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'uni-app-sync-no-git-'))

  await assert.rejects(
    syncSources({
      cacheDir: path.join(temp, 'cache', 'dcloud'),
      docsCommonRepo: path.join(temp, 'missing-common'),
      gitBin: path.join(temp, 'missing-git'),
      uniAppRepo: path.join(temp, 'missing-unidocs'),
      knowledgeRepo: path.join(temp, 'missing-knowledge'),
    }),
    /Git executable was not found/i,
  )
})

test('refuses cache targets outside a dedicated dcloud cache directory', async () => {
  await assert.rejects(
    syncSources({
      cacheDir: path.resolve('.git'),
      uniAppRepo: '/missing',
      knowledgeRepo: '/missing',
    }),
    /dedicated DCloud cache directory/i,
  )
})

test('keeps a newly published version readable when post-publication cleanup fails', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'uni-app-sync-cleanup-'))
  const cacheDir = path.join(temp, 'cache', 'dcloud')
  const uniAppRepo = path.join(temp, 'unidocs-zh')
  const docsCommonRepo = path.join(temp, 'docs-common')
  const knowledgeRepo = path.join(temp, 'uni-agent-knowledges')

  await createRepository(uniAppRepo, { 'docs/api/request.md': 'classic' }, 'master')
  await createRepository(docsCommonRepo, { 'tutorial/platform.md': 'platform' }, 'main')
  await createRepository(
    knowledgeRepo,
    { 'knowledges/unicloud/docs/jql.md': 'JQL' },
    'main',
  )

  const results = await syncSources({
    cacheDir,
    cleanup: async () => {
      throw new Error('simulated cleanup failure')
    },
    docsCommonRepo,
    knowledgeRepo,
    uniAppRepo,
  })

  const manifest = await readCurrentManifest(cacheDir)
  assert.equal(results.warnings.length, 1)
  assert.match(results.warnings[0], /simulated cleanup failure/)
  assert.ok(manifest.version)
  assert.equal(
    await readFile(
      path.join(
        cacheDir,
        'versions',
        manifest.version,
        'unidocs-zh',
        'docs',
        'api',
        'request.md',
      ),
      'utf8',
    ),
    'classic',
  )
})
