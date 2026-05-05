import { desktopCompanionStateSchema } from "@scratch-ai/shared";

import { formatAiConfigSourceLabel, formatAiConfigSummary } from "./renderer-view";
import type { DesktopCompanionApi } from "../common/desktop-companion-api";
import type { DesktopCompanionState } from "../common/types";

declare global {
  interface Window {
    desktopCompanionApi?: DesktopCompanionApi;
  }
}

const statusElement = document.getElementById("settings-status");
const configSummaryElement = document.getElementById("settings-config-summary");
const configSourceElement = document.getElementById("settings-current-source");
const configModelElement = document.getElementById("settings-current-model");
const configPathElement = document.getElementById("settings-config-path");
const currentPromptStatusElement = document.getElementById("settings-current-prompt-status");
const customAiApiKeyInput = document.getElementById("settings-custom-ai-api-key") as HTMLInputElement | null;
const saveCustomAiApiKeyButton = document.getElementById(
  "settings-save-custom-ai-api-key-button"
) as HTMLButtonElement | null;
const clearCustomAiApiKeyButton = document.getElementById(
  "settings-clear-custom-ai-api-key-button"
) as HTMLButtonElement | null;
const customAiPromptInput = document.getElementById("settings-custom-ai-prompt") as HTMLTextAreaElement | null;
const saveCustomAiPromptButton = document.getElementById(
  "settings-save-custom-ai-prompt-button"
) as HTMLButtonElement | null;
const clearCustomAiPromptButton = document.getElementById(
  "settings-clear-custom-ai-prompt-button"
) as HTMLButtonElement | null;
const errorElement = document.getElementById("settings-error");
const feedbackElement = document.getElementById("settings-feedback");
let lastPromptFromState = "";
let lastDefaultPromptFromState = "";

function resolvePromptEditorValue(savedPrompt?: string, defaultPrompt?: string) {
  if (typeof savedPrompt === "string" && savedPrompt.trim()) {
    return savedPrompt;
  }

  if (typeof defaultPrompt === "string" && defaultPrompt.trim()) {
    return defaultPrompt;
  }

  return "";
}

function getDesktopCompanionApi() {
  if (!window.desktopCompanionApi) {
    throw new Error("预加载脚本没有就绪，请退出旧实例后重新打开设置窗口。");
  }
  return window.desktopCompanionApi;
}

function showMessage(message: string, kind: "error" | "success") {
  if (feedbackElement) {
    feedbackElement.textContent = message;
    feedbackElement.dataset.kind = kind;
    feedbackElement.hidden = false;
  }

  if (errorElement) {
    errorElement.textContent = kind === "error" ? message : "";
    errorElement.hidden = kind !== "error";
  }
}

function clearError() {
  if (errorElement) {
    errorElement.textContent = "";
    errorElement.hidden = true;
  }
}

function syncCustomPromptInput(savedPrompt?: string, defaultPrompt?: string) {
  if (!customAiPromptInput) {
    return;
  }

  const nextPrompt = resolvePromptEditorValue(savedPrompt, defaultPrompt);
  const hasLocalEdits = customAiPromptInput.value !== lastPromptFromState;
  const isEditing = document.activeElement === customAiPromptInput;

  if (!isEditing || !hasLocalEdits) {
    customAiPromptInput.value = nextPrompt;
  }

  lastPromptFromState = nextPrompt;
  lastDefaultPromptFromState =
    typeof defaultPrompt === "string" && defaultPrompt.trim() ? defaultPrompt : "";
}

function normalizeState(rawState: unknown): DesktopCompanionState {
  return desktopCompanionStateSchema.parse(rawState);
}

function renderState(state: DesktopCompanionState) {
  if (statusElement) {
    statusElement.textContent = state.aiConfigured
      ? "已检测到可用的 DeepSeek 配置"
      : "当前还没有可用的 DeepSeek 配置";
  }

  if (configSummaryElement) {
    configSummaryElement.textContent = formatAiConfigSummary(state);
  }

  if (configSourceElement) {
    configSourceElement.textContent = formatAiConfigSourceLabel(state.aiConfigSource);
  }

  if (configModelElement) {
    configModelElement.textContent = state.aiModel ?? "deepseek-v4-flash";
  }

  if (configPathElement) {
    configPathElement.textContent = state.aiConfigPath ?? "未检测到程序自带配置文件路径";
  }

  if (currentPromptStatusElement) {
    currentPromptStatusElement.textContent = state.aiCustomPromptConfigured
      ? "已保存自定义提示词"
      : "当前使用程序默认提示词";
  }

  if (customAiApiKeyInput) {
    customAiApiKeyInput.disabled = state.aiStatus === "loading";
  }

  if (saveCustomAiApiKeyButton) {
    saveCustomAiApiKeyButton.disabled = state.aiStatus === "loading";
  }

  if (clearCustomAiApiKeyButton) {
    clearCustomAiApiKeyButton.disabled = state.aiStatus === "loading" || !state.aiCustomKeyConfigured;
  }

  syncCustomPromptInput(state.aiCustomPrompt, state.aiDefaultPrompt);

  if (customAiPromptInput) {
    customAiPromptInput.disabled = state.aiStatus === "loading";
  }

  if (saveCustomAiPromptButton) {
    saveCustomAiPromptButton.disabled = state.aiStatus === "loading";
  }

  if (clearCustomAiPromptButton) {
    clearCustomAiPromptButton.disabled = state.aiStatus === "loading" || !state.aiCustomPromptConfigured;
  }
}

saveCustomAiApiKeyButton?.addEventListener("click", () => {
  saveCustomAiApiKeyButton.disabled = true;
  const apiKey = customAiApiKeyInput?.value?.trim() ?? "";

  void Promise.resolve()
    .then(() => {
      clearError();
      if (!apiKey) {
        throw new Error("请先输入自定义 DeepSeek API Key。");
      }

      return getDesktopCompanionApi().saveCustomAiApiKey(apiKey);
    })
    .then(() => {
      if (customAiApiKeyInput) {
        customAiApiKeyInput.value = "";
      }

      showMessage("已保存自定义 DeepSeek API Key，后续会优先使用它。", "success");
    })
    .catch((error) => {
      showMessage(error instanceof Error ? error.message : "保存自定义 DeepSeek API Key 失败，请查看日志。", "error");
    })
    .finally(() => {
      window.setTimeout(() => {
        if (saveCustomAiApiKeyButton) {
          saveCustomAiApiKeyButton.disabled = false;
        }
      }, 400);
    });
});

clearCustomAiApiKeyButton?.addEventListener("click", () => {
  clearCustomAiApiKeyButton.disabled = true;

  void Promise.resolve()
    .then(() => {
      clearError();
      return getDesktopCompanionApi().clearCustomAiApiKey();
    })
    .then(() => {
      if (customAiApiKeyInput) {
        customAiApiKeyInput.value = "";
      }

      showMessage("已清除自定义 DeepSeek API Key，程序会按环境变量和内置配置继续回退。", "success");
    })
    .catch((error) => {
      showMessage(error instanceof Error ? error.message : "清除自定义 DeepSeek API Key 失败，请查看日志。", "error");
    })
    .finally(() => {
      window.setTimeout(() => {
        if (clearCustomAiApiKeyButton) {
          clearCustomAiApiKeyButton.disabled = false;
        }
      }, 400);
    });
});

saveCustomAiPromptButton?.addEventListener("click", () => {
  saveCustomAiPromptButton.disabled = true;
  const prompt = customAiPromptInput?.value?.trim() ?? "";

  void Promise.resolve()
    .then(() => {
      clearError();
      if (!prompt) {
        throw new Error("请先输入教师提示词。");
      }

      return getDesktopCompanionApi().saveCustomAiPrompt(prompt);
    })
    .then(() => {
      showMessage("已保存教师提示词，后续生成的下一步提示会优先使用它。", "success");
    })
    .catch((error) => {
      showMessage(error instanceof Error ? error.message : "保存教师提示词失败，请查看日志。", "error");
    })
    .finally(() => {
      window.setTimeout(() => {
        if (saveCustomAiPromptButton) {
          saveCustomAiPromptButton.disabled = false;
        }
      }, 400);
    });
});

clearCustomAiPromptButton?.addEventListener("click", () => {
  clearCustomAiPromptButton.disabled = true;

  void Promise.resolve()
    .then(() => {
      clearError();
      return getDesktopCompanionApi().clearCustomAiPrompt();
    })
    .then(() => {
      if (customAiPromptInput) {
        customAiPromptInput.value = lastDefaultPromptFromState;
      }
      lastPromptFromState = lastDefaultPromptFromState;
      showMessage("已恢复默认教师提示词。", "success");
    })
    .catch((error) => {
      showMessage(error instanceof Error ? error.message : "恢复默认教师提示词失败，请查看日志。", "error");
    })
    .finally(() => {
      window.setTimeout(() => {
        if (clearCustomAiPromptButton) {
          clearCustomAiPromptButton.disabled = false;
        }
      }, 400);
    });
});

void Promise.resolve()
  .then(() => getDesktopCompanionApi().getInitialState())
  .then((rawState) => {
    renderState(normalizeState(rawState));
  })
  .catch((error) => {
    showMessage(error instanceof Error ? error.message : "设置窗口初始化失败，请重试。", "error");
  });

try {
  getDesktopCompanionApi().onStateChange((rawState) => {
    renderState(normalizeState(rawState));
  });
} catch (error) {
  showMessage(error instanceof Error ? error.message : "设置窗口状态监听失败，请重试。", "error");
}
