import { coachResponseSchema, getDisplayLabelForOpcode, projectSnapshotSchema } from "@scratch-ai/shared";

import type { LoadedDeepSeekConfig } from "./deepseek-config";
import type { CoachResponse, ProgramAreaModule, ProjectSnapshot, RecommendedBlock, SpriteSnapshot } from "../common/types";

const DEFAULT_FALLBACK_MODEL = "local-heuristic";
const DEFAULT_DEEPSEEK_MAX_TOKENS = 2048;
export const DEFAULT_HINT_ONLY_SYSTEM_PROMPT =
  "你是 Scratch 小学编程助教。请根据学生当前作品，给出具体、可执行、面向小学生的中文提示，但不要直接给完整答案，不要写完整脚本，也不要把积木顺序一次性全部告诉学生。你只能做诊断、缩小下一步范围、提示关键积木和追问。即使上下文里有 teachingReference，它也只是老师先导入的参考作品；你必须先判断学生当前项目已经做到哪一步，再只补当前最缺的一小步。所有自然语言必须使用中文，不要出现英文 opcode、英文积木名、英文字段解释，避免中英混杂。";
const HINT_ONLY_OUTPUT_REQUIREMENTS =
  "输出必须是一个 JSON 对象，字段只能包含 answerText、recommendedBlocks、nextStep、detectedIssues、followUpQuestion。recommendedBlocks 里每个元素必须包含 opcode、category、label、reason，可选 example。detectedIssues 里每个元素必须包含 severity、title、description，可选 spriteName，其中 severity 只能是 info 或 warning。不要输出 Markdown，不要输出额外解释。";
const HINT_ONLY_USER_PROMPT =
  "请根据下面的 Scratch 项目上下文，给出“下一步做什么”的提示。先看学生当前 Scratch 项目，再在必要时对照教师参考作品补当前还缺的一小步。优先基于学生已经使用过的模块继续推进，不要让学生一下子大改，也不要直接泄露完整答案。";

interface GenerateCoachHintOptions {
  snapshot: ProjectSnapshot;
  currentTargetPrograms: string[];
  programAreaModules: ProgramAreaModule[];
  usedExtensions: string[];
  loadedExtensions: string[];
  referenceSnapshot?: ProjectSnapshot;
  referenceCurrentTargetPrograms?: string[];
  referenceProgramAreaModules?: ProgramAreaModule[];
  referenceUsedExtensions?: string[];
  referenceLoadedExtensions?: string[];
  referenceSourceLabel?: string;
  goal?: string;
  aiConfig: LoadedDeepSeekConfig;
  customSystemPrompt?: string;
}

export interface GenerateCoachHintResult {
  source: "deepseek" | "fallback";
  model: string;
  coachResponse: CoachResponse;
  warning?: string;
}

function createRecommendedBlock(
  opcode: string,
  category: string,
  label: string,
  reason: string,
  example?: string
): RecommendedBlock {
  const block: RecommendedBlock = {
    opcode,
    category,
    label,
    reason
  };

  if (example) {
    block.example = example;
  }

  return block;
}

function getCurrentTargetSprite(snapshot: ProjectSnapshot) {
  return snapshot.sprites.find((sprite) => sprite.name === snapshot.currentTarget) ?? snapshot.sprites[0] ?? null;
}

function getCurrentTargetOpcodes(snapshot: ProjectSnapshot) {
  const sprite = getCurrentTargetSprite(snapshot);
  if (!sprite) {
    return [];
  }

  return sprite.scripts.flatMap((script) => script.blockOpcodes);
}

function hasOpcodePrefix(opcodes: string[], prefix: string) {
  return opcodes.some((opcode) => opcode.startsWith(prefix));
}

function hasModule(programAreaModules: ProgramAreaModule[], moduleId: string) {
  return programAreaModules.some((module) => module.id === moduleId);
}

function describeModules(programAreaModules: ProgramAreaModule[]) {
  if (programAreaModules.length === 0) {
    return "还没读取到当前角色的模块使用情况";
  }

  return programAreaModules
    .slice(0, 5)
    .map((module) => `${module.label}×${module.blockCount}`)
    .join("、");
}

function buildCompactSprites(snapshot: ProjectSnapshot, currentTargetName?: string) {
  return snapshot.sprites.slice(0, 8).map((sprite: SpriteSnapshot) => ({
    name: sprite.name,
    isStage: sprite.isStage,
    blockCount: sprite.blockCount,
    variables: sprite.variables.map((variable) => variable.name),
    scripts:
      sprite.name === currentTargetName
        ? sprite.scripts.map((script) => script.blockSequence)
        : sprite.scripts.slice(0, 2).map((script) => script.blockSequence)
  }));
}

function localizeProgramDescription(program: string) {
  if (typeof program !== "string") {
    return "";
  }

  const parts = program
    .split("->")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (/[\u4e00-\u9fff]/.test(part)) {
        return part;
      }
      return getDisplayLabelForOpcode(part);
    });

  return parts.join(" -> ");
}

function localizeProgramDescriptions(programs: string[]) {
  return programs.map((program) => localizeProgramDescription(program)).filter(Boolean);
}

function buildReferenceProgramList(snapshot: ProjectSnapshot) {
  const currentTarget = getCurrentTargetSprite(snapshot);
  if (!currentTarget) {
    return [];
  }

  return currentTarget.scripts
    .map((script) => script.blockSequence.join(" -> ").trim())
    .filter(Boolean);
}

function buildBlockSuggestionFromOpcode(opcode: string) {
  switch (opcode) {
    case "event_whenflagclicked":
      return createRecommendedBlock("event_whenflagclicked", "事件", "当绿旗被点击", "先给脚本一个明确的开始时机。");
    case "event_whenbroadcastreceived":
      return createRecommendedBlock("event_whenbroadcastreceived", "事件", "当接收到消息", "适合把多个角色之间的配合关联起来。");
    case "motion_gotoxy":
      return createRecommendedBlock("motion_gotoxy", "运动", "移到 x: y:", "先把角色放到需要的起点位置。");
    case "motion_movesteps":
      return createRecommendedBlock("motion_movesteps", "运动", "移动 10 步", "先让角色动起来，学生更容易看到效果。");
    case "motion_pointtowards":
      return createRecommendedBlock("motion_pointtowards", "运动", "面向...", "如果角色要跟随某个目标，先让方向正确。");
    case "control_forever":
      return createRecommendedBlock("control_forever", "控制", "一直重复", "把动作放进循环里，效果才会持续发生。");
    case "control_repeat":
      return createRecommendedBlock("control_repeat", "控制", "重复执行", "先用固定次数循环测试行为。");
    case "control_if":
      return createRecommendedBlock("control_if", "控制", "如果...那么", "让角色开始根据条件判断下一步。");
    case "sensing_touchingobject":
      return createRecommendedBlock("sensing_touchingobject", "侦测", "碰到...？", "适合做碰撞、得分、触发消息等互动。");
    case "data_setvariableto":
      return createRecommendedBlock("data_setvariableto", "变量", "将变量设为", "先把分数、生命值等状态初始化。");
    case "data_changevariableby":
      return createRecommendedBlock("data_changevariableby", "变量", "将变量增加", "完成某个动作或满足条件后，用它更新结果。");
    case "looks_show":
      return createRecommendedBlock("looks_show", "外观", "显示", "让角色在该出现的时候可见。");
    case "looks_sayforsecs":
      return createRecommendedBlock("looks_sayforsecs", "外观", "说 2 秒", "给学生一个看得见的反馈，方便调试。");
    default:
      return null;
  }
}

function buildReferenceStarterBlocks(referenceSnapshot: ProjectSnapshot) {
  const referenceOpcodes = getCurrentTargetOpcodes(referenceSnapshot);
  const seen = new Set<string>();
  const blocks: RecommendedBlock[] = [];

  for (const opcode of referenceOpcodes) {
    if (seen.has(opcode)) {
      continue;
    }

    seen.add(opcode);
    const block = buildBlockSuggestionFromOpcode(opcode);
    if (!block) {
      continue;
    }

    blocks.push(block);
    if (blocks.length >= 3) {
      return blocks;
    }
  }

  if (blocks.length > 0) {
    return blocks;
  }

  return [
    createRecommendedBlock("event_whenflagclicked", "事件", "当绿旗被点击", "先给脚本一个明确的开始时机。"),
    createRecommendedBlock("motion_movesteps", "运动", "移动 10 步", "先让角色动起来，再继续往下搭。"),
    createRecommendedBlock("control_forever", "控制", "一直重复", "把刚才的动作放到循环里，效果才会持续。")
  ];
}

function buildGenericFallbackCoachResponse(options: GenerateCoachHintOptions): CoachResponse {
  const { snapshot, currentTargetPrograms, programAreaModules, goal } = options;
  const currentTarget = snapshot.currentTarget || "当前角色";
  const currentSprite = getCurrentTargetSprite(snapshot);
  const opcodes = getCurrentTargetOpcodes(snapshot);
  const recommendedBlocks: RecommendedBlock[] = [];
  const detectedIssues: CoachResponse["detectedIssues"] = [];

  let nextStep = `先围绕 ${currentTarget} 补一个更清晰的小目标。`;
  let answerText = `我看到 ${currentTarget} 现在主要用了 ${describeModules(programAreaModules)}。下一步先收紧范围，只补一个学生自己也能完成的小功能。`;
  let followUpQuestion = "你希望这个角色下一步对什么做出反应，比如按键、碰撞还是计分？";

  if (currentTargetPrograms.length === 0 || !currentSprite || currentSprite.blockCount === 0) {
    nextStep = `先让 ${currentTarget} 拥有一个最小可运行脚本：事件开始，再加一个动作反馈。`;
    answerText = goal
      ? `我还没看到 ${currentTarget} 的完整脚本。先搭一个最小版本，往“${goal}”靠近一点点，不要一次把整套答案做完。`
      : `我还没看到 ${currentTarget} 的完整脚本。先搭一个最小版本，让角色先动起来或说一句话，再继续往下加。`;
    recommendedBlocks.push(
      createRecommendedBlock("event_whenflagclicked", "事件", "当绿旗被点击", "给脚本一个清楚的开始时机。"),
      createRecommendedBlock("motion_movesteps", "运动", "移动 10 步", "先做一个最直观的动作反馈。"),
      createRecommendedBlock("looks_sayforsecs", "外观", "说 2 秒", "学生更容易看出脚本已经被触发。", "比如：我开始执行啦")
    );
    detectedIssues.push({
      severity: "info",
      title: "当前角色还没有完整脚本",
      description: "建议先做一个能立刻运行的小脚本，再继续添加更复杂的规则。",
      spriteName: currentTarget
    });
    followUpQuestion = "你想先让角色动起来，还是先做一个看得见的提示？";
  } else if (!hasOpcodePrefix(opcodes, "event_")) {
    nextStep = "先补一个事件积木，把现有动作接到明确的触发时机后面。";
    answerText = `现在 ${currentTarget} 已经有动作思路了，但还缺少清楚的“什么时候开始执行”。先补事件，学生会更容易理解流程。`;
    recommendedBlocks.push(
      createRecommendedBlock("event_whenflagclicked", "事件", "当绿旗被点击", "适合先做统一启动。"),
      createRecommendedBlock("event_whenkeypressed", "事件", "当按下某个键", "适合做角色控制或交互触发。"),
      createRecommendedBlock("looks_sayforsecs", "外观", "说 2 秒", "触发后给一个可见反馈，方便调试。")
    );
    detectedIssues.push({
      severity: "warning",
      title: "脚本触发条件不够清楚",
      description: "学生可能已经拼好了动作，但还缺少“什么时候开始”的事件积木。",
      spriteName: currentTarget
    });
    followUpQuestion = "你想让这个角色在绿旗点击时开始，还是在按键时开始？";
  } else if (!hasOpcodePrefix(opcodes, "control_repeat") && !hasOpcodePrefix(opcodes, "control_forever")) {
    nextStep = "把现有动作放进“重复执行”或“一直重复”里，让角色持续表现。";
    answerText = "当前脚本已经能跑起来了，下一步最值得补的是循环。这样角色不只做一次动作，作品会更像一个完整的小动画或小游戏。";
    recommendedBlocks.push(
      createRecommendedBlock("control_repeat", "控制", "重复执行", "先做固定次数的循环测试。"),
      createRecommendedBlock("control_forever", "控制", "一直重复", "适合持续移动、持续检测或持续绘制。"),
      createRecommendedBlock("motion_turnright", "运动", "右转 15 度", "放进循环里更容易看出连续效果。")
    );
    followUpQuestion = "你希望它一直循环，还是只循环几次？";
  } else if (hasModule(programAreaModules, "motion") && !hasModule(programAreaModules, "sensing")) {
    nextStep = "在现有动作外面加一个侦测条件，让角色开始根据环境变化行为。";
    answerText = `现在 ${currentTarget} 已经会动了，下一步很适合补“侦测”。这样学生就能从“会动”进阶到“会判断、会互动”。`;
    recommendedBlocks.push(
      createRecommendedBlock("sensing_touchingobject", "侦测", "碰到...？", "让角色开始根据环境做判断。"),
      createRecommendedBlock("control_if", "控制", "如果...那么", "把侦测结果变成真正的行为变化。"),
      createRecommendedBlock("motion_ifonedgebounce", "运动", "碰到边缘就反弹", "适合快速做出可见的互动结果。")
    );
    followUpQuestion = "你希望角色碰到边缘、鼠标，还是另一个角色时发生变化？";
  } else if (!hasModule(programAreaModules, "data")) {
    nextStep = "加一个变量，例如“分数”或“时间”，把作品从演示推进到有规则。";
    answerText = "当前脚本已经不只是单纯动作了。下一步可以加变量，让学生开始理解“状态”会随着事件变化。";
    recommendedBlocks.push(
      createRecommendedBlock("data_setvariableto", "变量", "将变量设为", "先初始化一个核心变量。"),
      createRecommendedBlock("data_changevariableby", "变量", "将变量增加", "完成动作或满足条件时更新结果。"),
      createRecommendedBlock("looks_sayforsecs", "外观", "说 2 秒", "变量变化后给一个可见反馈，方便调试。")
    );
    followUpQuestion = "如果这是一个小游戏，你最想先记录分数、时间，还是生命值？";
  } else {
    nextStep = "在现有脚本基础上补一个“如果...那么”判断，让角色会根据情况切换行为。";
    answerText = "这个项目已经有基础结构了。下一步不用一下子加太多，而是在现有动作外面补一层条件判断，让行为更像真实规则。";
    recommendedBlocks.push(
      createRecommendedBlock("control_if", "控制", "如果...那么", "让角色开始区分不同情况。"),
      createRecommendedBlock("operator_equals", "运算", "= ", "适合配合变量或侦测结果做判断。"),
      createRecommendedBlock("looks_switchcostumeto", "外观", "切换造型", "判断成立时给一个明显反馈。")
    );
  }

  return {
    answerText,
    recommendedBlocks,
    nextStep,
    detectedIssues,
    followUpQuestion
  };
}

function buildSystemPrompt(customSystemPrompt?: string) {
  const basePrompt = customSystemPrompt?.trim() || DEFAULT_HINT_ONLY_SYSTEM_PROMPT;
  return `${basePrompt}\n\n${HINT_ONLY_OUTPUT_REQUIREMENTS}`;
}

function buildReferenceAwareFallbackCoachResponse(options: GenerateCoachHintOptions): CoachResponse {
  const referenceSnapshot = options.referenceSnapshot;
  if (!referenceSnapshot) {
    return buildGenericFallbackCoachResponse(options);
  }

  const currentTarget = options.snapshot.currentTarget || "当前角色";
  const currentSprite = getCurrentTargetSprite(options.snapshot);
  const referenceTarget = referenceSnapshot.currentTarget || getCurrentTargetSprite(referenceSnapshot)?.name || "参考角色";
  const referencePrograms =
    options.referenceCurrentTargetPrograms?.filter(Boolean) ?? buildReferenceProgramList(referenceSnapshot);
  const referenceModules = options.referenceProgramAreaModules?.length
    ? options.referenceProgramAreaModules
    : referenceSnapshot.programAreaModules;
  const referenceOpcodes = getCurrentTargetOpcodes(referenceSnapshot);
  const currentOpcodes = getCurrentTargetOpcodes(options.snapshot);
  const starterBlocks = buildReferenceStarterBlocks(referenceSnapshot);
  const nextReferenceBlocks = referenceOpcodes
    .filter((opcode, index) => referenceOpcodes.indexOf(opcode) === index && !currentOpcodes.includes(opcode))
    .map((opcode) => buildBlockSuggestionFromOpcode(opcode))
    .filter((block): block is RecommendedBlock => Boolean(block))
    .slice(0, 3);
  const currentModuleIds = new Set(options.programAreaModules.map((module) => module.id));
  const missingReferenceModule = referenceModules.find((module) => !currentModuleIds.has(module.id));

  if (options.currentTargetPrograms.length === 0 || !currentSprite || currentSprite.blockCount === 0) {
    return {
      answerText: options.goal
        ? `你现在打开的是一个新项目，我们继续参考刚才导入的教师参考作品，一步一步朝“${options.goal}”靠近。先不要急着完整复刻，先把 ${referenceTarget} 的第一段基础脚本搭起来。`
        : `你现在打开的是一个新项目，我们继续参考刚才导入的教师参考作品。先不要一次把完整作品全做出来，先把 ${referenceTarget} 的第一段基础脚本搭起来。`,
      recommendedBlocks: starterBlocks,
      nextStep: referencePrograms[0]
        ? `先在当前 Scratch 里补一段最小脚本，去模仿参考作品里 ${referenceTarget} 的开头思路：${referencePrograms[0]}。`
        : "先补出一段最小起步脚本：用事件积木开始，再加一个动作或循环，让角色先动起来。",
      detectedIssues: [
        {
          severity: "info",
          title: "当前 Scratch 还是新项目",
          description: `已保留教师参考作品作为参考目标。建议先补一段最小起步脚本，再一点一点靠近参考作品里 ${referenceTarget} 的效果。`,
          spriteName: currentTarget
        }
      ],
      followUpQuestion: `你想先把参考作品里 ${referenceTarget} 的哪一步搭出来：先触发、先移动，还是先做循环？`
    };
  }

  return {
    answerText: "你现在已经开始搭当前的 Scratch 项目了。下一步可以继续参考刚才导入的教师参考作品，只补一小段当前还没有的关键积木，不要一下子把整套答案搭完。",
    recommendedBlocks: nextReferenceBlocks.length > 0 ? nextReferenceBlocks : starterBlocks,
    nextStep: missingReferenceModule
      ? `先补上参考作品里已经用到、但你当前项目里还没用到的“${missingReferenceModule.label}”相关积木。`
      : referencePrograms[0]
        ? `先把当前项目和参考作品对比一下，只补一小段更接近 ${referenceTarget} 的脚本：${referencePrograms[0]}。`
        : "先从参考作品里选一小段你现在还没做到的效果，只补这一小步。",
    detectedIssues: [
      {
        severity: "info",
        title: "当前工程还没完成参考作品里的关键一步",
        description: "建议保持“参考作品 + 当前进度”的方式，一次只补一小段，让学生能自己完成。",
        spriteName: currentTarget
      }
    ],
    followUpQuestion: "你看看你当前的项目和参考作品相比，最先缺的是触发、循环，还是碰撞 / 加分？"
  };
}

function buildFallbackCoachResponse(options: GenerateCoachHintOptions): CoachResponse {
  if (options.referenceSnapshot) {
    return buildReferenceAwareFallbackCoachResponse(options);
  }

  return buildGenericFallbackCoachResponse(options);
}

function buildPromptContext(options: GenerateCoachHintOptions) {
  const { snapshot, currentTargetPrograms, programAreaModules, usedExtensions, loadedExtensions, goal } = options;
  const currentTarget = getCurrentTargetSprite(snapshot);

  const context = {
    goal: goal?.trim() || snapshot.goal || "",
    analysisPriority: options.referenceSnapshot
      ? "先看学生当前 Scratch 项目，再对照教师参考作品补当前还缺的一小步。"
      : "只分析学生当前 Scratch 项目，先判断已经完成了什么，再补下一小步。",
    currentTarget: snapshot.currentTarget || "",
    currentTargetPrograms: localizeProgramDescriptions(currentTargetPrograms),
    programAreaModules,
    usedExtensions,
    loadedExtensions,
    detectedConcepts: snapshot.detectedConcepts,
    sprites: buildCompactSprites(snapshot, currentTarget?.name),
    globalVariables: snapshot.globalVariables.map((variable) => ({
      name: variable.name,
      value: variable.value
    }))
  };

  if (!options.referenceSnapshot) {
    return context;
  }

  const referenceTarget = getCurrentTargetSprite(options.referenceSnapshot);
  const localizedReferencePrograms = localizeProgramDescriptions(options.referenceCurrentTargetPrograms?.filter(Boolean) ?? []);
  const referenceCurrentTargetPrograms =
    localizedReferencePrograms.length > 0
      ? localizedReferencePrograms
      : localizeProgramDescriptions(buildReferenceProgramList(options.referenceSnapshot));

  return {
    ...context,
    teachingReference: {
      sourceLabel: options.referenceSourceLabel ?? "imported-project-url",
      currentTarget: options.referenceSnapshot.currentTarget || "",
      currentTargetPrograms: referenceCurrentTargetPrograms,
      programAreaModules:
        options.referenceProgramAreaModules?.length
          ? options.referenceProgramAreaModules
          : options.referenceSnapshot.programAreaModules,
      usedExtensions: options.referenceUsedExtensions ?? options.referenceSnapshot.loadedExtensions,
      loadedExtensions: options.referenceLoadedExtensions ?? options.referenceSnapshot.loadedExtensions,
      detectedConcepts: options.referenceSnapshot.detectedConcepts,
      sprites: buildCompactSprites(options.referenceSnapshot, referenceTarget?.name),
      globalVariables: options.referenceSnapshot.globalVariables.map((variable) => ({
        name: variable.name,
        value: variable.value
      }))
    }
  };
}

function extractMessageContent(rawPayload: unknown) {
  if (!rawPayload || typeof rawPayload !== "object") {
    return "";
  }

  const payload = rawPayload as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => (item && typeof item.text === "string" ? item.text : ""))
      .join("")
      .trim();
  }

  return "";
}

function parseJsonObject(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("DeepSeek 返回了空内容。");
  }

  const withoutFence = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")
    : trimmed;

  return JSON.parse(withoutFence);
}

function normalizeTextValue(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function normalizeDetectedIssueSeverity(value: unknown): "info" | "warning" {
  const normalized = normalizeTextValue(value)?.toLowerCase();
  if (!normalized) {
    return "info";
  }

  if (["warning", "warn", "high", "medium", "critical", "error", "severe"].includes(normalized)) {
    return "warning";
  }

  return "info";
}

function normalizeCoachResponse(rawPayload: unknown) {
  if (!rawPayload || typeof rawPayload !== "object") {
    return rawPayload;
  }

  const candidate = rawPayload as Record<string, unknown>;
  const answerText =
    normalizeTextValue(candidate.answerText) ??
    normalizeTextValue(candidate.answer) ??
    normalizeTextValue(candidate.summary);
  const nextStep =
    normalizeTextValue(candidate.nextStep) ??
    normalizeTextValue(candidate.next_action) ??
    normalizeTextValue(candidate.nextAction);
  const followUpQuestion =
    normalizeTextValue(candidate.followUpQuestion) ??
    normalizeTextValue(candidate.follow_up_question) ??
    normalizeTextValue(candidate.followUp);

  const recommendedBlocks = Array.isArray(candidate.recommendedBlocks)
    ? candidate.recommendedBlocks
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
        .map((item) => {
          const opcode = normalizeTextValue(item.opcode) ?? "unknown_block";
          const category = normalizeTextValue(item.category) ?? "其他";
          const rawLabel =
            normalizeTextValue(item.label) ??
            normalizeTextValue(item.blockName);
          const label =
            rawLabel && !/^[a-z0-9_]+$/i.test(rawLabel)
              ? rawLabel
              : getDisplayLabelForOpcode(opcode);
          const reason =
            normalizeTextValue(item.reason) ??
            normalizeTextValue(item.description) ??
            "适合作为下一步尝试。";
          const example = normalizeTextValue(item.example);

          return {
            opcode,
            category,
            label,
            reason,
            ...(example ? { example } : {})
          };
        })
    : [];

  const detectedIssues = Array.isArray(candidate.detectedIssues)
    ? candidate.detectedIssues
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
        .map((item) => {
          const title =
            normalizeTextValue(item.title) ??
            normalizeTextValue(item.summary) ??
            "需要留意的一点";
          const description =
            normalizeTextValue(item.description) ??
            normalizeTextValue(item.reason) ??
            title;
          const spriteName =
            normalizeTextValue(item.spriteName) ??
            normalizeTextValue(item.sprite);

          return {
            severity: normalizeDetectedIssueSeverity(item.severity),
            title,
            description,
            ...(spriteName ? { spriteName } : {})
          };
        })
    : [];

  return {
    answerText,
    recommendedBlocks,
    nextStep,
    detectedIssues,
    ...(followUpQuestion ? { followUpQuestion } : {})
  };
}

export class CoachService {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async generateHint(options: GenerateCoachHintOptions): Promise<GenerateCoachHintResult> {
    const snapshot = projectSnapshotSchema.parse(options.snapshot) as ProjectSnapshot;
    const referenceSnapshot = options.referenceSnapshot
      ? (projectSnapshotSchema.parse(options.referenceSnapshot) as ProjectSnapshot)
      : undefined;
    const normalizedOptions = {
      ...options,
      snapshot,
      ...(referenceSnapshot ? { referenceSnapshot } : {})
    };

    if (!options.aiConfig.configured || !options.aiConfig.apiKey) {
      return {
        source: "fallback",
        model: DEFAULT_FALLBACK_MODEL,
        coachResponse: buildFallbackCoachResponse(normalizedOptions)
      };
    }

    try {
      const coachResponse = await this.requestDeepSeek(normalizedOptions);
      return {
        source: "deepseek",
        model: options.aiConfig.model,
        coachResponse
      };
    } catch (error) {
      return {
        source: "fallback",
        model: DEFAULT_FALLBACK_MODEL,
        coachResponse: buildFallbackCoachResponse(normalizedOptions),
        warning: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async requestDeepSeek(options: GenerateCoachHintOptions) {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, options.aiConfig.timeoutMs);

    try {
      const promptContext = buildPromptContext(options);
      const systemPrompt = buildSystemPrompt(options.customSystemPrompt);
      const userPrompt = `${HINT_ONLY_USER_PROMPT}\n\n${JSON.stringify(promptContext, null, 2)}`;
      const response = await this.fetchImpl(`${options.aiConfig.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${options.aiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: options.aiConfig.model,
          thinking: {
            type: "disabled"
          },
          temperature: 0.3,
          max_tokens: DEFAULT_DEEPSEEK_MAX_TOKENS,
          response_format: {
            type: "json_object"
          },
          [Symbol.for("legacyMessages")]: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt
            }
          ],
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt
            }
          ]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`DeepSeek 请求失败：${response.status} ${responseText.slice(0, 240)}`);
      }

      const rawPayload = await response.json();
      const messageContent = extractMessageContent(rawPayload);
      const parsedJson = parseJsonObject(messageContent);
      const normalizedJson = normalizeCoachResponse(parsedJson);
      return coachResponseSchema.parse(normalizedJson) as CoachResponse;
    } finally {
      clearTimeout(timer);
    }
  }
}
