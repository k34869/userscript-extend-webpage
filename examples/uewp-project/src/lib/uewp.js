/**
 * URL 模式匹配
 * @param {string} pattern 模式
 * @param {string} [url=location.href] 要匹配的 URL
 * @return {boolean} 匹配是否成功
*/
function urlMatch(pattern, url = location.href) {
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
      if (typeof route.modules === 'function') {
        route.modules()
      } else if (typeof Array.isArray(route.modules)) {
        for (const handler of routes.modules) {
          if (typeof handler === 'function') {
            handler()
          }
        }
      }
    }
  }
}