const fs = require('fs')
const path = require('path')

// 定义 manifest.config.ts 文件路径
const manifestPath = path.join(__dirname, 'manifest.config.ts')
// 定义 build-info.json 文件路径
const buildInfoPath = path.join(__dirname, 'build-info.json')

// 读取 build-info.json 文件
fs.readFile(buildInfoPath, 'utf8', (readBuildInfoErr, buildInfoData) => {
  if (readBuildInfoErr) {
    console.error('读取 build-info.json 文件时出错:', readBuildInfoErr)
    return
  }

  try {
    const buildInfo = JSON.parse(buildInfoData)
    const currentVersionName = buildInfo.version
    const parts = currentVersionName.split('.')
    parts[2] = (parseInt(parts[2], 10) + 1).toString()
    const newVersionName = parts.join('.')

    // 计算新的 versionCode
    const versionParts = newVersionName.split('.').map(Number)
    const newVersionCode = versionParts[0] * 10000 + versionParts[1] * 100 + versionParts[2]

    // 设置新的版本号到 process.env.VERSION
    process.env.VERSION = newVersionName

    // 读取 manifest.config.ts 文件内容
    fs.readFile(manifestPath, 'utf8', (readManifestErr, manifestData) => {
      if (readManifestErr) {
        console.error('读取 manifest.config.ts 文件时出错:', readManifestErr)
        return
      }

      // 提取当前版本号的正则表达式
      const versionNameRegex = /versionName: '(\d+\.\d+\.\d+)',/
      const versionCodeRegex = /versionCode: '(\d+)',/

      // 替换文件中的版本号
      const newManifestData = manifestData
        .replace(versionNameRegex, `versionName: '${newVersionName}',`)
        .replace(versionCodeRegex, `versionCode: '${newVersionCode}',`)

      // 写入更新后的文件
      fs.writeFile(manifestPath, newManifestData, 'utf8', (writeErr) => {
        if (writeErr) {
          console.error('写入 manifest.config.ts 文件时出错:', writeErr)
          return
        }
        console.log(
          `版本号已更新为: versionName: ${newVersionName}, versionCode: ${newVersionCode}`,
        )
      })

      // 更新 build-info.json 文件
      buildInfo.version = newVersionName
      const updatedBuildInfoData = JSON.stringify(buildInfo, null, 2)
      fs.writeFile(buildInfoPath, updatedBuildInfoData, 'utf8', (writeBuildInfoErr) => {
        if (writeBuildInfoErr) {
          console.error('写入 build-info.json 文件时出错:', writeBuildInfoErr)
        }
      })
    })
  } catch (parseErr) {
    console.error('解析 build-info.json 文件时出错:', parseErr)
  }
})
