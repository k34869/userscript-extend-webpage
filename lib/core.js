const fs = require('fs');
const path = require('path');
const cheerio = require("cheerio");
const minify = require('html-minifier').minify;

function error(msg, code) {
    console.error('\033[31merror\033[0m: ' + msg);
    if (code === undefined) eval(code);
    process.exit(1);
}

function isUrlFriendly(str) {
    const urlFriendlyPattern = /^[^\s~`!#$%\^&*+=\[\]\{|};:"'<>,/?]+$/;
    return urlFriendlyPattern.test(str);
}

function fileToBase64(file, mimeType) {
    mimeType = mimeType ?? path.parse(file).ext.replace('.', '')
    return `data:${mimeType};base64,${fs.readFileSync(file).toString('base64')}`;
}

function gUserScriptHeader(configs) {
    const { name = '', version = '1.0.0', description = '', author = '', require = [], exclude = [], grant = [], license = '', runAt = 'document-body' } = configs;
    let userscriptHeader = 
    '// ==UserScript==\n' + 
    `// @name         ${name}\n` + 
    `// @version      ${version}\n` + 
    `// @description  ${description}\n` + 
    `// @author       ${author}\n` + 
    `// @license      ${license}\n` + 
    `// @run-at       ${runAt}\n` + 
    '// ==/UserScript==';
    exclude.forEach(e => {
        userscriptHeader = userscriptHeader.replace('// ==/UserScript==', `// @exclude      ${e}\n// ==/UserScript==`);
    });
    grant.forEach(e => {
        userscriptHeader = userscriptHeader.replace('// ==/UserScript==', `// @grant        ${e}\n// ==/UserScript==`);
    });
    require.forEach(e => {
        userscriptHeader = userscriptHeader.replace('// ==/UserScript==', `// @require      ${e}\n// ==/UserScript==`);
    });
    return userscriptHeader;
}

function gElementAndStyleCode(options) {
    const { elements, cssCode } = options;
    let elsCode = '';
    let elsInsertDomCode = '';
    elements.each((i, el) => {
        const attribs = el.attribs;
        const html = $(el).html();
        const name = $(el).attr('name');
        if (html === '') return;

        for (const [key, value] of Object.entries(attribs)) {
            if (key === 'append' && value !== '') {
                elsInsertDomCode += `$('${value}').append(options.__elements__.$${name});`;
            } else if (key === 'prepend' && value !== '') {
                elsInsertDomCode += `$('${value}').prepend(options.__elements__.$${name});`;
            } else if (key === 'replace' && value !== '') {
                elsInsertDomCode += `$('${value}').html(options.__elements__.$${name});`;
            }
        }
        elsCode += `$${name}: $(\`${html}\`),`
    })
    const styleCode = cssCode === null ? 'options.__style__ = undefined;' : `options.__style__ = $(\`<style>${cssCode}</style>\`);`;
    elsCode = `options.__elements__ = { ${elsCode} }`;
    elsInsertDomCode = elsInsertDomCode === '' ? '' : `options.__exec__ = function () { ${elsInsertDomCode} };`;
    return { elsCode, elsInsertDomCode, styleCode };
}

function gResInjectCode(options) {
    const { routeName, resFiles, resFilesMap } = options;
    let requireCode = '';
    if (Array.isArray(resFiles)) {
        resFiles.forEach(e => {
            if (e.search(/^@\//) === -1) {
                throw new Error(`'${req[key]}' must start with '@/'`);
            }
            if (e in resFilesMap) {
                requireCode += `'${e}': ${resFilesMap[e]}.require('${e}', false), `;
            } else {
                resFilesMap[e] = routeName;
                const resPath = e.replace('@', 'assets');
                const extName = path.parse(resPath).ext.replace('.', '');
                if (extName.search(/^jpg$|^jpeg$|^png$|^webp$|^bmp$|^gif$|^woff$|^woff2$/g) !== -1) {
                    const base64 = fileToBase64(resPath, extName);
                    requireCode += `'${e}': () => { return \`${base64}\` }, `;
                } else if (extName === 'json') {
                    const jsonObject = JSON.parse(fs.readFileSync(resPath, 'utf8'));
                    const jsonString = JSON.stringify(jsonObject);
                    requireCode += `'${e}': () => { return ${jsonString} }, `;
                } else if (extName === 'js') {
                    const jsCode = fs.readFileSync(resPath, 'utf8');
                    requireCode += `'${e}': () => { ${jsCode} }, `;
                } else if (extName === 'css') {
                    const cssCode = minify(`<style>${fs.readFileSync(resPath, 'utf8')}</style>`, {
                        removeComments: true,
                        collapseWhitespace: true,
                        minifyJS: false,
                        minifyCSS: true
                    });
                    requireCode += `'${e}': () => { const cssCode = \`${cssCode}\`;$(document.head).append(cssCode);return cssCode; }, `;
                }
            }
        });
        return `${routeName}.require = (requireFile, isCall = true) => { const require = { ${requireCode} };const d = require[requireFile];return isCall ? d() : d; }`;
    } else {
        return '';
    }
}

function gRouteExecCode(routeName, { routesPattern, routesExecutorCode, routesName, resFilesMap }) {
    global.$ = cheerio.load(minify(fs.readFileSync(`./routes/${routeName}.html`, 'utf8'), {
        removeComments: true,
        collapseWhitespace: true,
        minifyJS: false,
        minifyCSS: true
    }));
    const elements = $('elements el');
    const cssCode = $('style').html();
    const routes = $('script').attr('routes');
    const resFiles = eval($('script').attr('resinject'));
    const optionsCode = $('script').html();
    try {
        eval(optionsCode);
    } catch (err) {
        console.error('\033[31merror\033[0m: ' + `'${routeName}.html': ${err.message}`);
        return
    }
    const elsAndStyle = gElementAndStyleCode({ elements, cssCode });
    const resInjectCode = gResInjectCode({ routeName, resFiles, resFilesMap });
    routesPattern.push(...eval(routes));
    routesExecutorCode.push(`const ${routeName} = () => { const options = ${optionsCode};${elsAndStyle.styleCode}${elsAndStyle.elsInsertDomCode}${elsAndStyle.elsCode};return options; };${routeName}.routes = ${routes};${resInjectCode};`);
    routesName.push(routeName);
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const hour = ('0' + date.getHours()).slice(-2);
    const minute = ('0' + date.getMinutes()).slice(-2);
    const second = ('0' + date.getSeconds()).slice(-2);
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

module.exports = {
    error,
    isUrlFriendly,
    gUserScriptHeader,
    gRouteExecCode,
    formatDate
}