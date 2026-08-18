import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  collectMatches,
  collectMatchesFromRoots,
  isExcludedUniAppLine,
  isExcludedUniAppPath,
  parseSearchArgs,
} from './search-docs.mjs'

test('rejects an empty query and unknown source', () => {
  assert.throws(() => parseSearchArgs(['--source', 'uni-app']), /query is required/i)
  assert.throws(
    () => parseSearchArgs(['--source', 'uni-app-x', 'request']),
    /source must be one of: uni-app, unicloud/i,
  )
})

test('excludes uni-app x, HarmonyOS, mini-program, UTS, and UVue paths', () => {
  const excludedPaths = [
    'uni-app-x/api/request.md',
    'api/uniCloud.md',
    'harmony/api/request.md',
    'tutorial/app-harmony.md',
    'tutorial/mp-weixin.md',
    'api/other/open-miniprogram.md',
    'plugin/uts-plugin.md',
    'component/button.uvue.md',
    'plugin/utssdk-helper.md',
  ]

  for (const filePath of excludedPaths) {
    assert.equal(isExcludedUniAppPath(filePath), true, filePath)
  }

  assert.equal(isExcludedUniAppPath('api/request/request.md'), false)
  assert.equal(isExcludedUniAppPath('app/android.md'), false)
})

test('excludes out-of-scope result lines without hiding H5 and App guidance', () => {
  for (const line of [
    '仅支持 uni-app x',
    'release note for uni-app-x',
    'UniAppXApplication is available',
    'lowercase uniappx entry',
    '使用 UTS 和 UVue',
    'UTSJSONObject is available',
    'UTSiOSHookProxy is available',
    'utssdk compatibility entry',
    'uniCloud is available',
    '仅微信小程序支持',
    'navigateToMiniProgram example',
    'HarmonyOS Next',
    'app-harmony build target',
  ]) {
    assert.equal(isExcludedUniAppLine(line), true, line)
  }

  assert.equal(isExcludedUniAppLine('H5 和 App 均支持 uni.request'), false)
})

test('collects only allowed markdown matches', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'uni-app-search-'))
  await mkdir(path.join(root, 'api'), { recursive: true })
  await mkdir(path.join(root, 'uni-app-x'), { recursive: true })
  await writeFile(path.join(root, 'api', 'request.md'), 'uni.request works on H5 and App\n')
  await writeFile(path.join(root, 'api', 'mini.md'), 'uni.request 微信小程序 only\n')
  await writeFile(path.join(root, 'uni-app-x', 'request.md'), 'uni.request for UTS\n')
  await writeFile(path.join(root, 'api', 'request.txt'), 'uni.request in a non-markdown file\n')

  const matches = await collectMatches({
    root,
    query: 'uni.request',
    source: 'uni-app',
    maxResults: 20,
  })

  assert.deepEqual(matches, [
    {
      file: 'api/request.md',
      line: 1,
      text: 'uni.request works on H5 and App',
    },
  ])
})

test('supports natural multi-term queries and ranks stronger matches first', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'uni-app-search-terms-'))
  await mkdir(path.join(root, 'tutorial'), { recursive: true })
  await writeFile(
    path.join(root, 'tutorial', 'lifecycle.md'),
    [
      '页面生命周期 includes onLoad',
      '组件生命周期 includes onMounted',
      '页面 title configuration',
    ].join('\n'),
  )

  const matches = await collectMatches({
    root,
    query: '页面 生命周期 组件',
    source: 'uni-app',
    maxResults: 3,
  })

  assert.deepEqual(
    matches.map(match => match.text),
    [
      '组件生命周期 includes onMounted',
      '页面生命周期 includes onLoad',
      '页面 title configuration',
    ],
  )
})

test('searches dependent official roots and favors direct guides over release notes', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'uni-app-search-roots-'))
  const unidocsRoot = path.join(root, 'unidocs')
  const commonRoot = path.join(root, 'common')
  await mkdir(unidocsRoot, { recursive: true })
  await mkdir(path.join(commonRoot, 'tutorial'), { recursive: true })
  await writeFile(
    path.join(unidocsRoot, 'release.md'),
    'H5 条件编译 supports APP-PLUS',
  )
  await writeFile(
    path.join(commonRoot, 'tutorial', 'platform.md'),
    'H5 条件编译 supports APP-PLUS',
  )

  const matches = await collectMatchesFromRoots({
    maxResults: 2,
    query: '条件编译 H5 APP-PLUS',
    roots: [
      { prefix: 'unidocs-zh/docs', root: unidocsRoot },
      { prefix: 'docs-common', root: commonRoot },
    ],
    source: 'uni-app',
  })

  assert.equal(matches[0].file, 'docs-common/tutorial/platform.md')
  assert.equal(matches[1].file, 'unidocs-zh/docs/release.md')
})

test('applies direct-guide boosts only when the query is relevant to that guide', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'uni-app-search-guide-ranking-'))
  await mkdir(path.join(root, 'tutorial'), { recursive: true })
  await writeFile(
    path.join(root, 'tutorial', 'platform.md'),
    '页面和组件 can use platform differences',
  )
  await writeFile(
    path.join(root, 'tutorial', 'page.md'),
    '页面和组件 lifecycle reference',
  )

  const matches = await collectMatches({
    maxResults: 2,
    query: '页面 lifecycle 组件',
    root,
    source: 'uni-app',
  })

  assert.equal(matches[0].file, 'tutorial/page.md')
  assert.equal(matches[1].file, 'tutorial/platform.md')
})
