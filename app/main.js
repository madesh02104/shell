const readline = require("readline");
const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

const findExecutableInPath = async (command) => {
  const pathEnv = process.env.PATH || "";
  const directories = pathEnv.split(path.delimiter);

  for (const dir of directories) {
    const fullPath = path.join(dir, command);

    try {
      await fs.access(fullPath, fs.constants.F_OK | fs.constants.X_OK);
      return fullPath;
    } catch (error) {
      continue;
    }
  }
  return null;
};

const runShell = async () => {
  while (true) {
    const answer = await question("$ ");
    const [command, ...args] = answer.trim().split(/\s+/);
    const shellBuiltins = ["exit", "echo", "type", "pwd"];
    if (command === "exit") {
      const exitCode = parseInt(args[0], 10);
      if (!isNaN(exitCode)) {
        rl.close();
        process.exit(exitCode);
      } else {
        rl.close();
        process.exit(0);
      }
    } else if (command === "echo") {
      console.log(args.join(" "));
    } else if (command === "type") {
      if (shellBuiltins.includes(args[0])) {
        console.log(`${args[0]} is a shell builtin`);
      } else {
        const fullPath = await findExecutableInPath(args[0]);
        if (fullPath) {
          console.log(`${args[0]} is ${fullPath}`);
        } else {
          console.log(`${args[0]} not found`);
        }
      }
    } else if (command === "pwd") {
      console.log(process.cwd());
    } else if (command === "cd") {
      const dir = args[0];

      if (!dir) {
        console.log("usage: cd <directory>");
      } else {
        try {
          if (dir === "~") {
            process.chdir(process.env.HOME);
          } else {
            process.chdir(dir);
          }
        } catch (err) {
          console.error(`cd: ${dir}: No such file or directory`);
        }
      }
    } else {
      const fullPath = await findExecutableInPath(command);
      if (fullPath) {
        rl.pause();
        await new Promise((resolve) => {
          const child = spawn(command, args, {
            stdio: "inherit",
          });

          child.on("exit", (code) => {
            resolve();
          });
        });
        rl.resume();
      } else {
        console.log(`${command}: command not found`);
      }
    }
  }
};

runShell();
