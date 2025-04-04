#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { program } = require('commander');
const { mkdirsSync } = require('fs-extra');
const chokidar = require('chokidar');
const prettier = require('prettier');
const {
    isUrlFriendly,
    gUserScriptHeader,
    gRouteExecCode,
    error,
    formatDate
} = require('./lib/core.js');
const package = require('./package.json');

function initialization(projectName, callback) {
    try {
        const isCurDir = projectName ? false : true
        projectName = projectName ?? path.basename(process.cwd());
        if (isUrlFriendly(projectName) === false) {
            error(`Sorry, name can only contain URL-friendly characters and name can no longer contain special characters ("~'!()*").`);
        } else {
            if (isCurDir) {
                if (fs.existsSync('./userscript.json')) {
                    console.log(`'${projectName}' project already exists.`);
                    if (typeof callback === 'function') callback();
                } else {
                    const s = initialization.createProject();
                    if (s.stat) {
                        console.log(`initialization successful.\n${path.resolve('./userscript.json')}`);
                        if (typeof callback === 'function') callback();
                    } else {
                        error(`${s.msg}\ninitialization failed.`);
                    }
                }
            } else {
                if (fs.existsSync(`${projectName}/userscript.json`)) {
                    console.log(`'${projectName}' project already exists.`);
                    if (typeof callback === 'function') callback();
                } else {
                    const s = initialization.createProject(projectName);
                    if (s.stat) {
                        console.log(`initialization successful.\n${path.resolve(projectName, './userscript.json')}`);
                        if (typeof callback === 'function') callback();
                    } else {
                        error(`${s.msg}\ninitialization failed.`);
                    }
                }
            }
        }
    } catch (err) {
        error(err.message);
    }
}
initialization.createProject = function (name = '.') {
    try {
        mkdirsSync(`${name}/routes`);
        mkdirsSync(`${name}/assets`);
        const userscript = {
            name: name === '.' ? path.basename(process.cwd()) : name,
            version: "1.0.0",
            description: "",
            author: "",
            license: "MIT"
        };
        fs.writeFileSync(`${name}/userscript.json`, JSON.stringify(userscript, null, 4), 'utf8');
        fs.writeFileSync(`${name}/routes/Test.html`, `<script routes="[ '*://www.test.com/*' ]">\n` + '    ({\n' + '        public: {\n' + "            message: 'This is Test UserScript-extendWebPage🚀'\n" + '        },\n' + '        loadExec() {\n' + '            document.write(this.message);\n' + '        }\n' + '    })\n' + '</script>', 'utf8');
        fs.writeFileSync(`${name}/index.js`, '', 'utf8');
        return { stat: true, msg: 'successful' };
    } catch (err) {
        return { stat: false, msg: err.message };
    }
}

function getProjectConfig() {
    if (!fs.existsSync(`./userscript.json`)) {
        error('please build in the directory containing the userscript.json file');
    } else {
        const data = fs.readFileSync('./userscript.json', 'utf8');
        const configs = JSON.parse(data);
        const { name = '', version = '', description = '', author = '', require = [], exclude = [], grant = [], license = '', runAt = '' } = configs;
        if (typeof name !== 'string') {
            error(`userscript.json config item 'name' must be of type string`);
        } else if (typeof version !== 'string') {
            error(`userscript.json config item 'version' must be of type string`);
        } else if (typeof description !== 'string') {
            error(`userscript.json config item 'description' must be of type string`);
        } else if (typeof author !== 'string') {
            error(`userscript.json config item 'author' must be of type string`);
        } else if (Array.isArray(exclude) === false) {
            error(`userscript.json config item 'exclude' must be of type array`);
        } else if (Array.isArray(grant) === false) {
            error(`userscript.json config item 'grant' must be of type array`);
        } else if (Array.isArray(require) === false) {
            error(`userscript.json config item 'require' must be of type array`);
        } else if (typeof license !== 'string') {
            error(`userscript.json config item 'license' must be of type string`);
        } else if (typeof runAt !== 'string') {
            error(`userscript.json config item 'runAt' must be of type string`);
        } else {
            return configs;
        }
    }
}

class Routes {
    constructor() {
        const items = fs.readdirSync(`${path.join('./', 'routes')}`);
        items.forEach(e => {
            const { ext } = path.parse(e);
            const itemPath = path.join('./', 'routes', e);
            const routeName = e.replace(ext, '');
            if (fs.statSync(itemPath).isFile() && ext === '.html') {
                gRouteExecCode(routeName, {
                    routesPattern: this.routesPattern,
                    routesName: this.routesName,
                    routesExecutorCode: this.routesExecutorCode,
                    resFilesMap: this.resFilesMap
                });
            }
        })
        this.routesPattern = new Set(this.routesPattern);
    }
    routesName = [];
    routesPattern = [];
    resFilesMap = [];
    routesExecutorCode = [];
    getTargetCode() {
        return prettier.format(`;(function () { ${fs.readFileSync('./index.js', 'utf8')}\n${this.routesExecutorCode.join('\n')}window.extendApp = extendWebPage([${this.routesName.join(',')}]); })();`, { parser: 'babel', tabWidth: 4 });
    }
}

function buildProject({ mode, configs }, callback) {
    let userscriptHeader = gUserScriptHeader(configs);
    const extendWebPageCode = fs.readFileSync(`${__dirname}/assets/extendWebPage.min.js`, 'utf8');
    const r = new Routes();
    r.routesPattern.forEach((e) => {
        userscriptHeader = userscriptHeader.replace('// ==/UserScript==', `// @match        ${e}\n// ==/UserScript==`);
    })
    r.getTargetCode()
        .then((routesCode) => {
            mkdirsSync('./dist');
            if (mode === 'develop') {
                userscriptHeader = userscriptHeader.replace('// ==/UserScript==', `// @require      file:///${path.resolve('./dist', configs.name + '.dev.js')}\n// ==/UserScript==`);
                const targetCode = `${extendWebPageCode}\n\n${routesCode}`;
                fs.writeFileSync(`./dist/${configs.name}.dev.js`, targetCode, 'utf8');
                fs.writeFileSync(`./dist/${configs.name}.user.js`, userscriptHeader, 'utf8');
            } else {
                const targetCode = `${userscriptHeader}\n\n${extendWebPageCode}\n\n${routesCode}`;
                fs.writeFileSync(`./dist/${configs.name}.user.js`, targetCode, 'utf8');
            }
            console.log(path.resolve('./dist', configs.name + '.user.js'));
            if (typeof callback === 'function') callback(configs.name);
        })
}

function watchProject(ignored, configs) {
    console.log('watch...');
    const watcher = chokidar.watch('./', { ignored })
    watcher.on('change', (path) => {
        buildProject({ mode: 'develop', configs });
        console.log(`${formatDate(new Date)}: '${path}' is change`);
    });
    watcher.on('unlink', (path) => {
        buildProject({ mode: 'develop', configs });
        console.log(`${formatDate(new Date)}: '${path}' is delete`);
    });
}

program
    .name(package.binName)
    .version(package.version)
    .description(package.description)
    .option('--open [open]', 'open build userscript file')
    .action(() => {
        try {
            const opts = program.opts();
            const configs = getProjectConfig();
            buildProject({ mode: 'produce', configs }, (name) => {
                if (opts.open) {
                    exec(`${typeof opts.open === 'string' ? opts.open : 'chrome'} ${path.resolve('./dist', `${name}.user.js`)}`, (err) => {
                        if (err) error(err.message);
                    });
                }
            });
        } catch (err) {
            error(err.message);
        }
    })

program
    .command('dev')
    .description('develop mode')
    .option('-w, --watch [watch]', `watch project`)
    .option('--open [open]', 'open build userscript with your default browser')
    .action(opts => {
        const configs = getProjectConfig();
        buildProject({ mode: 'develop', configs }, (name) => {
            if (opts.watch) {
                watchProject(new RegExp(configs.ignored ?? 'dist|\\.DS_Store|\\.idea|\\.vscode|node_modules|test'), configs)
            } else if (opts.open) {
                exec(`${typeof opts.open === 'string' ? opts.open : 'chrome'} ${path.resolve('./dist', `${name}.user.js`)}`, (err) => {
                    if (err) error(err.message);
                });
            }
        });
    })

program
    .command('init [name]')
    .description('initialize project')
    .option('--open [open]', 'open project')
    .action(name => {
        const opts = program.opts();
        initialization(name, () => {
            if (opts.open) {
                exec(`${typeof opts.open === 'string' ? opts.open : 'code'} ${name ?? './'}`, (err) => {
                    if (err) error(err.message);
                });
            }
        })
    })

program.parse()