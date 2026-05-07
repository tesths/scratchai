import { spawn } from "node:child_process";

const commands = [
  {
    label: "server-api",
    command: "uv",
    args: ["run", "--project", "apps/server-api", "uvicorn", "app.main:app", "--reload", "--app-dir", "apps/server-api"]
  },
  {
    label: "server-web",
    command: "npm",
    args: ["run", "dev", "--workspace=@scratch-ai/server-web"]
  }
];

const children = [];
let shuttingDown = false;

function stopChildren(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(exitCode), 50).unref();
}

for (const entry of commands) {
  const child = spawn(entry.command, entry.args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  child.on("exit", (code) => {
    if (!shuttingDown) {
      console.error(`[${entry.label}] exited with code ${code ?? 0}`);
      stopChildren(code ?? 0);
    }
  });

  child.on("error", (error) => {
    if (!shuttingDown) {
      console.error(`[${entry.label}] failed to start: ${error.message}`);
      stopChildren(1);
    }
  });

  children.push(child);
}

process.on("SIGINT", () => stopChildren(0));
process.on("SIGTERM", () => stopChildren(0));
