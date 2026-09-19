export function urlMatch(pattern, url = location.href) {
  pattern = pattern.replace(/\*/g, '.*?');
  pattern = '^' + pattern + '$';
  const regex = new RegExp(pattern);
  return regex.test(url);
}

export function execRoutes(path, exectors) {
  if (urlMatch(path)) {
    if (typeof exectors === 'function') {
      exectors();
    } else if (Array.isArray(exectors)) {
      for (const handler of exectors) {
        if (typeof handler === 'function') {
          handler();
        }
      }
    }
  }
}

export function applyRoutes(routes) {
  for (const route of routes) {
    if (typeof route.paths === 'string') {
      execRoutes(route.paths, route.exectors);
    } else if (Array.isArray(route.paths)) {
      for (const path of route.paths) {
        execRoutes(path, route.exectors);
      }
    }
  }
}
