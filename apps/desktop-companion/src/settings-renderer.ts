import { desktopCompanionStateSchema } from "@scratch-ai/shared";

import { formatAiConfigSourceLabel, formatAiConfigSummary } from "./renderer-view";
import type { DesktopCompanionApi } from "./desktop-companion-api";
import type { DesktopCompanionState } from "./types";

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
const customAiApiKeyInput = document.getElementById("settings-custom-ai-api-key") as HTMLInputElement | null;
const saveCustomAiApiKeyButton = document.getElementById(
  "settings-save-custom-ai-api-key-button"
) as HTMLButtonElement | null;
const clearCustomAiApiKeyButton = document.getElementById(
  "settings-clear-custom-ai-api-key-button"
) as HTMLButtonElement | null;
const errorElement = document.getElementById("settings-error");
const feedbackElement = document.getElementById("settings-feedback");

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

  if (customAiApiKeyInput) {
    customAiApiKeyInput.disabled = state.aiStatus === "loading";
  }

  if (saveCustomAiApiKeyButton) {
    saveCustomAiApiKeyButton.disabled = state.aiStatus === "loading";
  }

  if (clearCustomAiApiKeyButton) {
    clearCustomAiApiKeyButton.disabled = state.aiStatus === "loading" || !state.aiCustomKeyConfigured;
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
