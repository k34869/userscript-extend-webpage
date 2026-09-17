import packages from './package.json' with { type: 'json' }
import { program } from 'commander'

program
  .name(packages.binName)
  .version(packages.version)
  .description(packages.description)
  .action(() => {
    console.log('hello');
  });

program
  .command("create [name]")
  .description("create uewp project")
  .option("--open [open]", "open project")
  .action((name) => {
    console.log(name);
  });

program
  .command("dev")
  .description("Build for develop mode")
  .option("-w, --watch", "Rebuilds when modules have changed on disk")
  .action(() => {
    console.log('dev');
  });

program
  .command("build")
  .description("Build for production mode")
  .action(() => {
    console.log('build');
  });

program.parse();