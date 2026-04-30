import path from "node:path";
import os from "node:os";

function timestampString() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    "-",
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0")
  ].join("");
}

export function parseWorkflowArgs(argv) {
  const options = new Map();
  for (const item of argv.slice(2)) {
    if (!item.startsWith("--")) {
      continue;
    }
    const [key, value = ""] = item.split("=");
    options.set(key, value);
  }
  return options;
}

export function createWorkflowConfig(argv, cwd = process.cwd()) {
  const args = parseWorkflowArgs(argv);
  const workflowDir = path.join(cwd, "Windows-Test", "deepseek-workflow");
  const promptsDir = path.join(workflowDir, "prompts");
  const desktopDir = path.join(os.homedir(), "Desktop");

  return {
    cwd,
    workflowDir,
    promptsDir,
    briefPath:
      args.get("--brief") ||
      path.join(cwd, "Windows-Test", "fixtures", "deepseek-workflow-brief.example.json"),
    outputDir:
      args.get("--output-dir") ||
      path.join(desktopDir, `DeepSeek-Scratch-教学工作流-${timestampString()}`),
    models: {
      plan: args.get("--plan-model") || "deepseek-v4-pro",
      role: args.get("--role-model") || "deepseek-v4-flash",
      hint: args.get("--hint-model") || "deepseek-v4-flash",
      debug: args.get("--debug-model") || "deepseek-v4-pro"
    },
    repairAttempts: Number(args.get("--repair-attempts") || "1")
  };
}
