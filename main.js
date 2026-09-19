import packages from './package.json' with { type: 'json' };
import fs from 'fs-extra';
import path from 'path';
import { program } from 'commander';
import { exec } from 'child_process';
import { build } from './lib/core.js';
import chokidar from 'chokidar';
import ora from 'ora';
import chalk from 'chalk';
import ignore from 'ignore';

let prevName;

const buildConsole = async mode => {
  const start = process.hrtime();
  const spinner = ora('building').start();
  spinner.start();
  return build(mode)
    .then(({ name }) => {
      const [sec, nanosec] = process.hrtime(start);
      const ms = sec * 1000 + nanosec / 1e6;
      spinner.stop();
      if (mode === 'development') {
        console.log(
          '\n',
          chalk.blue.bold(
            `src/main.js -> dist/${name}.user.js @require dist/${name}.dev.js`,
            '\n',
            chalk.green.bold(`Took ${parseInt(ms)}ms`),
          ),
        );
      } else {
        console.log(
          '\n',
          chalk.blue.bold(
            `src/main.js -> dist/${name}.user.js`,
            '\n',
            chalk.green.bold(`Took ${parseInt(ms)}ms`),
          ),
        );
      }
      return name;
    })
    .catch(error => {
      throw error;
    });
};

const watcherBuildConsole = (path, state) => {
  const start = process.hrtime();
  console.log(
    chalk.yellow(
      ` ${new Date()} '${path}' is ${state === undefined ? 'delete' : 'change'}, building...`,
    ),
  );
  build('development').then(({ name }) => {
    if (prevName !== name) {
      console.log(
        '',
        chalk.blue.bold(
          `src/main.js -> dist/${name}.user.js @require dist/${name}.dev.js`,
        ),
      );
    }
    prevName = name;
    const [sec, nanosec] = process.hrtime(start);
    const ms = sec * 1000 + nanosec / 1e6;
    console.log(chalk.green.bold(` Took ${parseInt(ms)}ms`));
  });
};

const openDocs = () => {
  exec(
    (process.platform === 'win32'
      ? 'start'
      : process.platform === 'darwin'
        ? 'open'
        : 'xdg-open') +
      ' https://www.tampermonkey.net/documentation.php?locale=zh',
    error => {
      throw error;
    },
  );
};

program
  .name(packages.binName)
  .version(packages.version)
  .description(packages.description)
  .action(buildConsole);

program
  .command('init [name]')
  .description('Initialize uewp project.')
  .option('--open [open]', 'open project.')
  .action(name => {
    console.log(name);
  });

program
  .command('dev')
  .description('Build for development mode.')
  .option('-w, --watch', 'Rebuilds when modules have changed on disk.')
  .action(opts => {
    buildConsole('development').then(fristName => {
      prevName = fristName;
      if (opts.watch) {
        const ig = ignore();
        const gitignoreContent = fs.readFileSync(
          path.resolve('.gitignore'),
          'utf8',
        );
        ig.add(gitignoreContent);

        const isIgnored = filePath => {
          const relativePath = path.relative(process.cwd(), filePath);
          return relativePath === '' ? false : ig.ignores(relativePath);
        };

        const watcher = chokidar.watch('./', {
          ignored: isIgnored,
          ignoreInitial: true,
          persistent: true,
        });
        watcher.on('change', watcherBuildConsole);
        watcher.on('unlink', watcherBuildConsole);
      }
    });
  });

program
  .command('build')
  .description('Build for production mode.')
  .action(buildConsole);

program
  .command('docs')
  .description('Open tampermonkey documentation in default browser.')
  .action(openDocs);

program.parse();
