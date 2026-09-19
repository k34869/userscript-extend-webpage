/**
 * URL 模式匹配
 * @param {string} pattern 模式
 * @param {string} [url=location.href] 要匹配的 URL
 * @return {boolean} 匹配是否成功
*/
export function urlMatch(pattern, url = location.href) {
  pattern = pattern.replace(/\*/g, '.*?');
  pattern = '^' + pattern + '$';
  const regex = new RegExp(pattern);
  return regex.test(url);
}

/**
 * 应用路由
 * @param {object} routes 路由对象
 * @return {void}
*/
export function applyRoutes(routes) {
  for (const route of routes) {
    if (urlMatch(route.path)) {
      if (typeof route.exectors === 'function') {
        route.exectors()
      } else if (typeof Array.isArray(route.exectors)) {
        for (const handler of routes.exectors) {
          if (typeof handler === 'function') {
            handler()
          }
        }
      }
    }
  }
}