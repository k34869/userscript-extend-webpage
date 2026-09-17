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
 * 打包项目
*/
function bundle() {
  
}