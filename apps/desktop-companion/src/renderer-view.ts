import type { DesktopCompanionState } from "./types";

interface MinimalElement {
  textContent: string | null;
  hidden?: boolean;
  className?: string;
  dataset?: Record<string, string>;
  replaceChildren(...children: unknown[]): void;
  append(child: unknown): void;
}

interface MinimalDocument {
  createElement(tagName: string): MinimalElement;
}

export interface RendererElements {
  documentRef: MinimalDocument;
  statusElement?: MinimalElement | null;
  detailElement?: MinimalElement | null;
  currentTargetElement?: MinimalElement | null;
  updatedAtElement?: MinimalElement | null;
  programAreaModulesElement?: MinimalElement | null;
  currentTargetProgramsElement?: MinimalElement | null;
  aiStatusElement?: MinimalElement | null;
  aiAnswerElement?: MinimalElement | null;
  aiNextStepElement?: MinimalElement | null;
  aiRecommendedBlocksElement?: MinimalElement | null;
  aiDetectedIssuesElement?: MinimalElement | null;
  aiFollowUpQuestionElement?: MinimalElement | null;
  aiConfigSummaryElement?: MinimalElement | null;
  errorElement?: MinimalElement | null;
  scratchPathElement?: MinimalElement | null;
  retryButton?: HTMLButtonElement | null;
  launchButton?: HTMLButtonElement | null;
  chooseScratchButton?: HTMLButtonElement | null;
  generateAiButton?: HTMLButtonElement | null;
  analyzeProjectUrlButton?: HTMLButtonElement | null;
  goalInput?: HTMLTextAreaElement | null;
  projectUrlInput?: HTMLInputElement | null;
}

export function renderList(
  documentRef: MinimalDocument,
  container: MinimalElement | null | undefined,
  values: string[],
  emptyText: string,
  itemClassName?: string
) {
  if (!container) {
    return;
  }

  container.replaceChildren();
  if (values.length === 0) {
    const empty = documentRef.createElement("li");
    empty.className = "empty";
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }

  for (const value of values) {
    const item = documentRef.createElement("li");
    item.className = itemClassName ?? "";
    item.textContent = value;
    container.append(item);
  }
}

export function formatTimestamp(value?: string) {
  if (!value) {
    return "还没有收到数据";
  }

  return new Date(value).toLocaleString();
}

export function formatCurrentTarget(state: DesktopCompanionState) {
  if (!state.currentTargetName) {
    return "未识别";
  }

  return state.currentTargetIsStage ? `${state.currentTargetName}（舞台）` : state.currentTargetName;
}

export function formatCurrentTargetPrograms(programs: string[]) {
  return programs.map((program, index) => `脚本 ${index + 1}: ${program}`);
}

export function formatProgramAreaModules(
  modules: Array<{ label: string; blockCount: number }>
) {
  return modules.map((module) => `${module.label} × ${module.blockCount}`);
}

export function formatAiStatus(state: DesktopCompanionState) {
  if (state.aiStatus === "loading") {
    return "AI 正在整理当前项目并生成提示…";
  }

  if (state.aiStatus === "error") {
    return state.aiError ?? "AI 提示暂时不可用。";
  }

  if (state.aiCoachResponse && state.aiProvider === "deepseek") {
    const modelText = state.aiModel ? `（${state.aiModel}）` : "";
    return `当前提示来源：DeepSeek${modelText}，生成时间：${formatTimestamp(state.aiLastUpdatedAt)}`;
  }

  if (state.aiCoachResponse && state.aiProvider === "fallback") {
    return state.aiError
      ? `DeepSeek 暂时不可用，已切换到本地提示。`
      : "当前提示来源：本地提示。到“DeepSeek 设置”里保存 API Key 后会优先调用线上模型。";
  }

  if (!state.aiConfigured) {
    return "未配置 DeepSeek API Key。可打开“DeepSeek 设置”保存自定义 Key，或继续使用环境变量 / 程序自带配置。";
  }

  return "连接 Scratch 后，点击“生成 AI 提示”获取下一步建议。";
}

export function formatAiConfigSourceLabel(source?: DesktopCompanionState["aiConfigSource"]) {
  if (source === "custom") {
    return "设置窗口里的自定义 Key";
  }

  if (source === "env") {
    return "环境变量 DEEPSEEK_API_KEY";
  }

  if (source === "packaged") {
    return "程序自带 deepseek.config.json";
  }

  return "当前没有可用来源";
}

export function formatAiConfigSummary(state: DesktopCompanionState) {
  if (state.aiConfigSource === "custom") {
    return "当前优先使用设置窗口里保存的自定义 DeepSeek Key。";
  }

  if (state.aiConfigSource === "env") {
    return "当前优先使用环境变量 DEEPSEEK_API_KEY。";
  }

  if (state.aiConfigSource === "packaged") {
    return "当前优先使用程序自带的 DeepSeek 配置。";
  }

  return "当前还没有可用的 DeepSeek Key。";
}

export function formatRecommendedBlocks(state: DesktopCompanionState) {
  return (state.aiCoachResponse?.recommendedBlocks ?? []).map((block) => {
    const exampleText = block.example ? `；示例：${block.example}` : "";
    return `${block.category} / ${block.label}（${block.opcode}）：${block.reason}${exampleText}`;
  });
}

export function formatDetectedIssues(state: DesktopCompanionState) {
  return (state.aiCoachResponse?.detectedIssues ?? []).map((issue) => {
    const spriteText = issue.spriteName ? ` [${issue.spriteName}]` : "";
    return `${issue.severity === "warning" ? "注意" : "提示"}${spriteText}：${issue.title}。${issue.description}`;
  });
}

export function renderState(state: DesktopCompanionState, elements: RendererElements) {
  if (elements.statusElement) {
    elements.statusElement.textContent = state.statusText;
    if (elements.statusElement.dataset) {
      elements.statusElement.dataset.status = state.status;
    }
  }

  if (elements.detailElement) {
    elements.detailElement.textContent =
      state.detail ?? "伴随程序会自动等待 Scratch 出现。";
  }

  if (elements.currentTargetElement) {
    elements.currentTargetElement.textContent = formatCurrentTarget(state);
  }

  if (elements.updatedAtElement) {
    elements.updatedAtElement.textContent = formatTimestamp(state.lastUpdatedAt);
  }

  if (elements.scratchPathElement) {
    elements.scratchPathElement.textContent = state.scratchExecutablePath ?? "还没有选择";
  }

  if (elements.errorElement) {
    elements.errorElement.textContent = state.error ?? "";
    elements.errorElement.hidden = !state.error;
  }

  renderList(
    elements.documentRef,
    elements.currentTargetProgramsElement,
    formatCurrentTargetPrograms(state.currentTargetPrograms),
    "当前角色还没有可读取的程序。",
    "program-item"
  );

  renderList(
    elements.documentRef,
    elements.programAreaModulesElement,
    formatProgramAreaModules(state.programAreaModules),
    "当前角色还没有识别到模块使用。",
    "module-item"
  );

  if (elements.aiStatusElement) {
    elements.aiStatusElement.textContent = formatAiStatus(state);
  }

  if (elements.aiConfigSummaryElement) {
    elements.aiConfigSummaryElement.textContent = formatAiConfigSummary(state);
  }

  if (elements.aiAnswerElement) {
    elements.aiAnswerElement.textContent =
      state.aiCoachResponse?.answerText ?? "AI 会根据当前角色程序、已用模块和扩展，给出下一步建议。";
  }

  if (elements.aiNextStepElement) {
    elements.aiNextStepElement.textContent =
      state.aiCoachResponse?.nextStep ?? "下一步：先连接 Scratch，然后点击“生成 AI 提示”。";
  }

  renderList(
    elements.documentRef,
    elements.aiRecommendedBlocksElement,
    formatRecommendedBlocks(state),
    "这里会显示推荐积木和原因。",
    "hint-item"
  );

  renderList(
    elements.documentRef,
    elements.aiDetectedIssuesElement,
    formatDetectedIssues(state),
    "当前没有额外风险提示。",
    "issue-item"
  );

  if (elements.aiFollowUpQuestionElement) {
    elements.aiFollowUpQuestionElement.textContent =
      state.aiCoachResponse?.followUpQuestion ?? "追问：你想让这个角色下一步完成什么？";
  }

  const isBusy = state.status === "injecting";
  if (elements.retryButton) {
    elements.retryButton.disabled = isBusy || state.status === "unsupported";
  }
  if (elements.launchButton) {
    elements.launchButton.disabled =
      isBusy || state.status === "unsupported" || !state.scratchExecutablePath;
  }
  if (elements.chooseScratchButton) {
    elements.chooseScratchButton.disabled = isBusy || state.status === "unsupported";
  }
  if (elements.generateAiButton) {
    elements.generateAiButton.disabled =
      state.status !== "connected" || state.aiStatus === "loading";
  }
  if (elements.analyzeProjectUrlButton) {
    elements.analyzeProjectUrlButton.disabled = state.aiStatus === "loading";
  }
  if (elements.goalInput) {
    elements.goalInput.disabled = state.aiStatus === "loading";
  }
  if (elements.projectUrlInput) {
    elements.projectUrlInput.disabled = state.aiStatus === "loading";
  }
}
