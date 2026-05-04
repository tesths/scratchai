import { desktopCompanionStateSchema } from "@scratch-ai/shared";

import type { DesktopCompanionApi } from "./desktop-companion-api";
import { renderState } from "./renderer-view";
import type { DesktopCompanionState } from "./types";

declare global {
  interface Window {
    desktopCompanionApi?: DesktopCompanionApi;
  }
}

type LearningMode = "follow-teacher" | "self-paced";

const LEARNING_MODE_CONFIG: Record<
  LearningMode,
  {
    goal: string;
    note: string;
  }
> = {
  "follow-teacher": {
    goal: "跟着老师一步一步完成当前作品，只提示现在这一小步。",
    note: "默认推荐“跟老师做”：更符合“老师给 sb3，学生在 Scratch 里同步跟做”的课堂流程。"
  },
  "self-paced": {
    goal: "学生自己先尝试完成当前作品，只提示下一小步，不直接给完整答案。",
    note: "当前是“自己先做”：学生会先尝试，AI 只在卡住时补下一小步。"
  }
};

const statusElement = document.getElementById("status");
const detailElement = document.getElementById("detail");
const currentTargetElement = document.getElementById("current-target");
const updatedAtElement = document.getElementById("updated-at");
const programAreaModulesElement = document.getElementById("program-area-modules");
const currentTargetProgramsElement = document.getElementById("current-target-programs");
const aiStatusElement = document.getElementById("ai-status");
const aiAnswerElement = document.getElementById("ai-answer");
const aiNextStepElement = document.getElementById("ai-next-step");
const aiRecommendedBlocksElement = document.getElementById("ai-recommended-blocks");
const aiDetectedIssuesElement = document.getElementById("ai-detected-issues");
const aiFollowUpQuestionElement = document.getElementById("ai-follow-up-question");
const aiConfigSummaryElement = document.getElementById("ai-config-summary");
const learningModeNoteElement = document.getElementById("learning-mode-note");
const errorElement = document.getElementById("error");
const scratchPathElement = document.getElementById("scratch-path");
const launchButton = document.getElementById("launch-button") as HTMLButtonElement | null;
const chooseScratchButton = document.getElementById("choose-scratch-button") as HTMLButtonElement | null;
const retryButton = document.getElementById("retry-button") as HTMLButtonElement | null;
const settingsButton = document.getElementById("settings-button") as HTMLButtonElement | null;
const secondarySettingsButton = document.getElementById("secondary-settings-button") as HTMLButtonElement | null;
const generateAiButton = document.getElementById("generate-ai-button") as HTMLButtonElement | null;
const analyzeProjectUrlButton = document.getElementById("analyze-project-url-button") as HTMLButtonElement | null;
const projectUrlInput = document.getElementById("project-url-input") as HTMLInputElement | null;
const learningModeInputs = Array.from(
  document.querySelectorAll<HTMLInputElement>('input[name="learning-mode"]')
);

function showActionError(message: string) {
  if (!errorElement) {
    return;
  }

  errorElement.textContent = message;
  errorElement.hidden = false;
}

function getDesktopCompanionApi() {
  if (!window.desktopCompanionApi) {
    throw new Error("预加载脚本没有就绪，请退出旧实例后重新打开伴随程序。");
  }
  return window.desktopCompanionApi;
}

function getSelectedLearningMode(): LearningMode {
  const selectedValue = learningModeInputs.find((input) => input.checked)?.value;
  return selectedValue === "self-paced" ? "self-paced" : "follow-teacher";
}

function getLearningModeGoal() {
  return LEARNING_MODE_CONFIG[getSelectedLearningMode()].goal;
}

function syncLearningModeNote() {
  if (!learningModeNoteElement) {
    return;
  }

  learningModeNoteElement.textContent = LEARNING_MODE_CONFIG[getSelectedLearningMode()].note;
}

function normalizeState(rawState: unknown): DesktopCompanionState {
  return desktopCompanionStateSchema.parse(rawState);
}

function renderNormalizedState(rawState: unknown) {
  renderState(normalizeState(rawState), {
    documentRef: document,
    statusElement,
    detailElement,
    currentTargetElement,
    updatedAtElement,
    programAreaModulesElement,
    currentTargetProgramsElement,
    aiStatusElement,
    aiAnswerElement,
    aiNextStepElement,
    aiRecommendedBlocksElement,
    aiDetectedIssuesElement,
    aiFollowUpQuestionElement,
    aiConfigSummaryElement,
    errorElement,
    scratchPathElement,
    launchButton,
    chooseScratchButton,
    retryButton,
    generateAiButton,
    analyzeProjectUrlButton,
    projectUrlInput,
    learningModeInputs
  });
}

retryButton?.addEventListener("click", () => {
  retryButton.disabled = true;
  void Promise.resolve()
    .then(() => getDesktopCompanionApi().retryNow())
    .catch((error) => {
      showActionError(error instanceof Error ? error.message : "重新连接失败，请查看日志。");
    })
    .finally(() => {
      window.setTimeout(() => {
        if (retryButton) {
          retryButton.disabled = false;
        }
      }, 1200);
    });
});

launchButton?.addEventListener("click", () => {
  launchButton.disabled = true;
  void Promise.resolve()
    .then(() => getDesktopCompanionApi().launchScratch())
    .catch((error) => {
      showActionError(error instanceof Error ? error.message : "打开已选 Scratch 失败，请查看日志。");
    })
    .finally(() => {
      window.setTimeout(() => {
        if (launchButton) {
          launchButton.disabled = false;
        }
      }, 1200);
    });
});

chooseScratchButton?.addEventListener("click", () => {
  chooseScratchButton.disabled = true;
  void Promise.resolve()
    .then(() => getDesktopCompanionApi().chooseScratchExecutable())
    .catch(() => {
      showActionError("选择 Scratch 失败，请改用托盘菜单或查看日志。");
    })
    .finally(() => {
      window.setTimeout(() => {
        if (chooseScratchButton) {
          chooseScratchButton.disabled = false;
        }
      }, 400);
    });
});

function handleOpenSettings() {
  void Promise.resolve()
    .then(() => getDesktopCompanionApi().openSettings())
    .catch((error) => {
      showActionError(error instanceof Error ? error.message : "打开 DeepSeek 设置失败，请查看日志。");
    });
}

settingsButton?.addEventListener("click", handleOpenSettings);
secondarySettingsButton?.addEventListener("click", handleOpenSettings);

generateAiButton?.addEventListener("click", () => {
  generateAiButton.disabled = true;
  const goal = getLearningModeGoal();
  void Promise.resolve()
    .then(() => getDesktopCompanionApi().requestAiHint(goal))
    .catch((error) => {
      showActionError(error instanceof Error ? error.message : "更新下一步提示失败，请查看日志。");
    })
    .finally(() => {
      window.setTimeout(() => {
        if (generateAiButton) {
          generateAiButton.disabled = false;
        }
      }, 400);
    });
});

analyzeProjectUrlButton?.addEventListener("click", () => {
  const projectUrl = projectUrlInput?.value?.trim() ?? "";
  if (!projectUrl) {
    showActionError("请先粘贴老师的 sb3 地址。");
    projectUrlInput?.focus();
    return;
  }

  analyzeProjectUrlButton.disabled = true;
  const goal = getLearningModeGoal();
  void Promise.resolve()
    .then(() => getDesktopCompanionApi().requestAiHintFromProjectUrl(projectUrl, goal))
    .catch((error) => {
      showActionError(error instanceof Error ? error.message : "读取教师参考作品并生成提示失败，请查看日志。");
    })
    .finally(() => {
      window.setTimeout(() => {
        if (analyzeProjectUrlButton) {
          analyzeProjectUrlButton.disabled = false;
        }
      }, 400);
    });
});

for (const input of learningModeInputs) {
  input.addEventListener("change", syncLearningModeNote);
}

syncLearningModeNote();

void Promise.resolve()
  .then(() => getDesktopCompanionApi().getInitialState())
  .then(renderNormalizedState)
  .catch((error) => {
    showActionError(error instanceof Error ? error.message : "界面初始化失败，请重启伴随程序。");
  });

try {
  getDesktopCompanionApi().onStateChange(renderNormalizedState);
} catch (error) {
  showActionError(error instanceof Error ? error.message : "状态监听初始化失败，请重启伴随程序。");
}
