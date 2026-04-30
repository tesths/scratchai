import { createWorkflowConfig } from "./deepseek-workflow/config.mjs";
import { runTeachingWorkflow } from "./deepseek-workflow/workflow.mjs";

async function main() {
  const config = createWorkflowConfig(process.argv);
  const result = await runTeachingWorkflow(config);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
