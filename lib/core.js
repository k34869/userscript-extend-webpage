import path from 'path'
import { pathToFileURL } from 'url'
import fs from 'fs-extra'
import { rollup } from 'rollup'
import postcss from 'rollup-plugin-postcss'
import postcssUrl from 'postcss-url'
import importRaw from 'rollup-plugin-import-raw'
import image from '@rollup/plugin-image'

/**
 * 获取 用户脚本 配置对象
 * @return {Promise} resolve(配置对象)
*/
async function getConfiguration() {
  return Promise.all([
    import(
      pathToFileURL(path.resolve(process.cwd(), 'userscript.config.js'))
    ),
    fs.readFile(path.resolve(process.cwd(), 'package.json'), 'utf8')
  ]).then((values) => {
    const userscriptConfig = values[0].default
    const packages = JSON.parse(values[1])

    // userscript.config.js 与 package.json 配置合并
    userscriptConfig.name = userscriptConfig.name ?? packages.name
    userscriptConfig.version = userscriptConfig.version ?? packages.version
    userscriptConfig.description = userscriptConfig.description ?? packages.description
    userscriptConfig.author = userscriptConfig.author ?? packages.author
    userscriptConfig.license = userscriptConfig.license ?? packages.license

    return userscriptConfig
  }).catch((error) => {
    throw error;
  })
}

/**
 * 生成用户脚本头
 * @param {object} configuration 配置对象
 * @return {string} header 用户脚本元数据
*/
function generateUserScriptHeader(configuration) {
  let header = ''
  for (const key in configuration) {
    if (isArray(configuration[key])) {
      for (const item of configuration[key]) {
        header+=`// @${key}\t${item}\n`
      }
    } else if (isObject(configuration[key])) {
      for (const subKey in configuration[key]) {
        header+=`// @${key} ${subKey} ${configuration[key][subKey]}\n`
      }
    } else if (typeof configuration[key] === 'string') {
      header+=`// @${key}\t${configuration[key]}\n`
    } else {
      throw new Error(`'userscript.json' configuration '${key}' type error.`);
    }
  }
  return `// ==UserScript==\n${header}// ==/UserScript==\n`
}

/**
 * 模块打包
 * @return {Promise} resolve(生成结果)
*/
async function moduleBundler() {
  return rollup({
    input: './src/main.js',
    plugins: [
      postcss({
        extract: false,
        plugins: [
          postcssUrl({
            url: 'inline',
            maxSize: 1024*10
          })
        ]
      }),
      image(),
      importRaw()
    ]
  }).then((bundle) => {
    return bundle.generate({
      format: 'iife',
      inlineDynamicImports: true
    })
  })
}

export {
  getConfiguration,
  generateUserScriptHeader,
  moduleBundler
}