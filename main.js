import packages from './package.json' with { type: 'json' }
import { program } from 'commander'
import { exec } from 'child_process'
import { build } from './lib/core.js';

program
  .name(packages.binName)
  .version(packages.version)
  .description(packages.description)
  .action(() => {
    console.log('hello');
  });

program
  .command("init [name]")
  .description("Initialize uewp project.")
  .option("--open [open]", "open project")
  .action((name) => {
    console.log(name);
  });

program
  .command("dev")
  .description("Build for development mode.")
  .option("-w, --watch", "Rebuilds when modules have changed on disk")
  .action(() => {
    console.log('dev');
  });

program
  .command("build")
  .description("Build for production mode.")
  .action(() => {
    console.log('build');
  });

program
  .command("docs")
  .description("Open tampermonkey documentation in default browser.")
  .action(() => {
    exec(
      (process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open') + ' https://www.tampermonkey.net/documentation.php?locale=zh',
      (error) => {
        throw error
      }
    );
  })

program.parse();