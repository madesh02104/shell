const readline = require("readline");
const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const SHELL_BUILTINS = ["exit", "echo", "type", "pwd", "cd"];

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

const handleExit = (args) => {
  const exitCode = parseInt(args[0], 10);
  if (!isNaN(exitCode)) {
    rl.close();
    process.exit(exitCode);
  } else {
    rl.close();
    process.exit(0);
  }
};

const handleEcho = (args) => {
  console.log(args.join(" "));
};

const handlePwd = () => {
  console.log(process.cwd());
};

const handleCd = (args) => {
  const dir = args[0];

  if (!dir) {
    console.log("usage: cd <directory>");
    return;
  }

  try {
    const targetDir = dir === "~" ? process.env.HOME : dir;
    process.chdir(targetDir);
  } catch (err) {
    console.error(`cd: ${dir}: No such file or directory`);
  }
};

const handleType = async (args) => {
  const targetCommand = args[0];

  if (SHELL_BUILTINS.includes(targetCommand)) {
    console.log(`${targetCommand} is a shell builtin`);
  } else {
    const fullPath = await findExecutableInPath(targetCommand);
    if (fullPath) {
      console.log(`${targetCommand} is ${fullPath}`);
    } else {
      console.log(`${targetCommand}: not found`);
    }
  }
};

const executeExternalCommand = async (command, args) => {
  const fullPath = await findExecutableInPath(command);

  if (fullPath) {
    rl.pause();
    await new Promise((resolve) => {
      const child = spawn(command, args, {
        stdio: "inherit",
      });

      child.on("exit", () => {
        resolve();
      });

      child.on("error", (err) => {
        console.error(`sh: ${command}: Operation failed: ${err.message}`);
        resolve();
      });
    });
    rl.resume();
  } else {
    console.log(`${command}: command not found`);
  }
};

const parseInput = (input) => {
  const tokens = [];
  let currentToken = "";
  let inSingleQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === "'") {
      inSingleQuotes = !inSingleQuotes;
    } else if (/\s/.test(char) && !inSingleQuotes) {
      if (currentToken.length > 0) {
        tokens.push(currentToken);
        currentToken = "";
      }
    } else {
      currentToken += char;
    }
  }

  if (currentToken.length > 0) {
    tokens.push(currentToken);
  }

  return tokens;
};

const BUILTIN_HANDLERS = {
  exit: handleExit,
  echo: handleEcho,
  type: handleType,
  pwd: handlePwd,
  cd: handleCd,
};

const runShell = async () => {
  while (true) {
    const answer = await question("$ ");
    const trimmedAnswer = answer.trim();

    if (!trimmedAnswer) continue;

    const tokens = parseInput(trimmedAnswer);
    if (tokens.length === 0) continue;
    const [command, ...args] = tokens;

    if (BUILTIN_HANDLERS[command]) {
      await BUILTIN_HANDLERS[command](args);
    } else {
      await executeExternalCommand(command, args);
    }
  }
};

runShell();
