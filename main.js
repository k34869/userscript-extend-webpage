import packages from './package.json' with { type: 'json' }
import fs from 'fs-extra'
import path from 'path'
import { program } from 'commander'
import { exec } from 'child_process'
import { build } from './lib/core.js';
import chokidar from 'chokidar'
import ora from 'ora';
import chalk from 'chalk'
import ignore from 'ignore';

const productionBuild = () => {
  const start = process.hrtime()
  const spinner = ora('building').start()
  spinner.start()
  build().then(() => {
    const [sec, nanosec] = process.hrtime(start);
    const ms = sec * 1000 + nanosec / 1e6
    spinner.stop()
    console.log('\n', chalk.blue.bold(`src/main.js -> dist/${packages.name}.user.js`, '\n', chalk.green.bold(`Took ${parseInt(ms)}ms`)));
  }).catch(error => {
    throw error
  })
}

const openDocs = () => {
  exec(
    (process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open') + ' https://www.tampermonkey.net/documentation.php?locale=zh',
    (error) => {
      throw error
    }
  );
}

program
  .name(packages.binName)
  .version(packages.version)
  .description(packages.description)
  .action(productionBuild);

program
  .command("init [name]")
  .description("Initialize uewp project.")
  .option("--open [open]", "open project.")
  .action((name) => {
    console.log(name);
  });

program
  .command("dev")
  .description("Build for development mode.")
  .option("-w, --watch", "Rebuilds when modules have changed on disk.")
  .action((opts) => {
    console.log('\n', chalk.blue.bold(`src/main.js -> dist/${packages.name}.user.js @require dist/${packages.name}.dev.js`));
    if (opts.watch) {
      const ig = ignore();
      const gitignoreContent = fs.readFileSync(path.resolve('.gitignore'), 'utf8')
      ig.add(gitignoreContent)

      const isIgnored = (filePath) => {
        const relativePath = path.relative(process.cwd(), filePath);
        return relativePath === '' ? false : ig.ignores(relativePath);
      };

      const watcher = chokidar.watch("./", {
        ignored: isIgnored,
        ignoreInitial: true,
        persistent: true
      });
      watcher.on("change", (path) => {
        console.log(path);
      });
      watcher.on("unlink", (path) => {
        console.log(path);
      });
    } else {

    }
  });

program
  .command("build")
  .description("Build for production mode.")
  .action(productionBuild);

program
  .command("docs")
  .description("Open tampermonkey documentation in default browser.")
  .action(openDocs)

program.parse();