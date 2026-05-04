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
    return "AI 正在整理作品并生成下一步提示…";
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
      ? "DeepSeek 暂时不可用，已自动切换到基础提示。"
      : "当前提示来源：基础提示。老师需要更完整结果时，可到“老师设置”里配置 DeepSeek。";
  }

  if (!state.aiConfigured) {
    return "还没配置 DeepSeek 也可以先用。程序会先给基础提示；老师需要更完整结果时，再到“老师设置”里配置。";
  }

  return "准备好了：分析当前 Scratch 作品，或直接分析网页作品。";
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
    return "当前优先使用设置页里保存的自定义 DeepSeek Key。";
  }

  if (state.aiConfigSource === "env") {
    return "当前优先使用环境变量 DEEPSEEK_API_KEY。";
  }

  if (state.aiConfigSource === "packaged") {
    return "当前优先使用程序自带的 DeepSeek 配置。";
  }

  return "当前还没有可用的 DeepSeek Key。";
}

export function formatDefaultDetail(state: DesktopCompanionState) {
  if (state.detail) {
    return state.detail;
  }

  if (state.status === "connected") {
    return "已经连接成功，直接点“分析当前 Scratch 作品”就可以。";
  }

  if (state.scratchExecutablePath) {
    return "已经记住 Scratch 程序了。现在点“打开 Scratch”即可。";
  }

  return "第一次使用先选一次 Scratch 程序，然后点“打开 Scratch”。";
}

export function formatDefaultNextStep(state: DesktopCompanionState) {
  if (state.aiCoachResponse?.nextStep) {
    return state.aiCoachResponse.nextStep;
  }

  if (state.status === "connected") {
    return "下一步：直接点“分析当前 Scratch 作品”。";
  }

  return "下一步：先打开 Scratch，或者粘贴一个作品链接。";
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
    elements.detailElement.textContent = formatDefaultDetail(state);
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
      state.aiCoachResponse?.answerText ?? "写下目标后，我会根据当前作品给出下一步建议。";
  }

  if (elements.aiNextStepElement) {
    elements.aiNextStepElement.textContent = formatDefaultNextStep(state);
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
