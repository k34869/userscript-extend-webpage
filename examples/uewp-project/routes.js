import hello from './modules/hello.js'

export default [
  {
    path: '*://www.baidu.com/*',
    modules: hello
  }
]