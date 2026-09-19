import fs from 'fs-extra'

/**
 * 判断字符串是否符合 URL 规范
 * @param {String} string 输入字符串
 * @return {Boolean}
*/
export function isUrlFriendly(string) {
  return /^[^\s~`!#$%\^&*+=\[\]\{|};:"'<>,/?]+$/.test(string);
}

/**
 * 判断值是否是数组
 * @param {any} value 输入值
 * @return {Boolean}
*/
export function isArray(value) {
  return Object.prototype.toString.call(value) === '[object Array]'
}

/**
 * 判断值是否是对象
 * @param {any} value 输入值
 * @return {Boolean}
*/
export function isObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}