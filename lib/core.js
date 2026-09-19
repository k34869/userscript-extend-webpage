import path from 'path'
import { pathToFileURL } from 'url'
import fs from 'fs-extra'
import { rollup } from 'rollup'
import postcss from 'rollup-plugin-postcss'
import postcssUrl from 'postcss-url'
import importRaw from 'rollup-plugin-import-raw'
import image from '@rollup/plugin-image'
import { isArray, isObject } from './utils.js'

/**
 * 获取 用户脚本 配置对象
 * @return {Promise} resolve(配置对象)
*/
async function getConfiguration() {
  return Promise.all([
    import(
      pathToFileURL(path.resolve(process.cwd(), 'userscript.config.js'))
    ),
    fs.readFile('./package.json', 'utf8')
  ]).then((values) => {
    const [ { default: comfigs }, packageJson ] = values
    const userscriptConfig = structuredClone(comfigs)
    const packages = JSON.parse(packageJson)

    // userscript.config.js 与 package.json 配置合并
    userscriptConfig.name = userscriptConfig.name ?? packages.name
    userscriptConfig.version = userscriptConfig.version ?? packages.version
    userscriptConfig.description = userscriptConfig.description ?? packages.description
    userscriptConfig.author = userscriptConfig.author ?? packages.author
    userscriptConfig.license = userscriptConfig.license ?? packages.license

    return userscriptConfig
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

/**
 * 构建生成 UserScript
 * @param {string} [mode='production'] 构建模式(production = 生产模式, development = 开发模式)
 * @return {Promise} 构建成功或失败的 Promise
*/
async function build(mode = 'production') {
  return Promise.all([
    getConfiguration(),
    moduleBundler(),
    fs.mkdirs('./dist')
  ]).then((values) => {
    const [ userscriptConfig, { output: [ { code } ] } ] = values

    if (mode === 'production') {
      const header = generateUserScriptHeader(userscriptConfig)
      return {
        userscriptConfig,
        code: `${header}\n${code}`
      }
    } else if (mode === 'development') {
      return fs.writeFile(`./dist/${userscriptConfig.name}.dev.js`, code, 'utf8')
        .then(() => {
          const require = [
            `file:///${path.resolve('./dist/', userscriptConfig.name + '.dev.js')}`
          ]
          userscriptConfig.require = userscriptConfig.require ? require.concat(userscriptConfig.require) : require
          const header = generateUserScriptHeader(userscriptConfig)
          return {
            userscriptConfig,
            code: header
          }
        })
    }
  }).then(async ({ userscriptConfig, code }) => {
    return fs.writeFile(`./dist/${userscriptConfig.name}.user.js`, code, 'utf8').then(() => userscriptConfig)
  })
}

export {
  build
}