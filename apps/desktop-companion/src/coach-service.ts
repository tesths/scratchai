import { coachResponseSchema, projectSnapshotSchema } from "@scratch-ai/shared";

import type { LoadedDeepSeekConfig } from "./deepseek-config";
import type { CoachResponse, ProgramAreaModule, ProjectSnapshot, RecommendedBlock, SpriteSnapshot } from "./types";

const DEFAULT_FALLBACK_MODEL = "local-heuristic";
const DEFAULT_DEEPSEEK_MAX_TOKENS = 2048;
const HINT_ONLY_SYSTEM_PROMPT =
  "你是 Scratch 小学编程助教。请根据学生当前作品，给出具体、可执行、面向小学生的中文提示，但不要直接给完整答案，不要写完整脚本，不要把积木顺序一次性全部告诉学生。你只能做诊断、缩小下一步范围、提示关键积木和追问。输出必须是一个 JSON 对象，字段只能包含 answerText、recommendedBlocks、nextStep、detectedIssues、followUpQuestion。recommendedBlocks 中每个元素必须包含 opcode、category、label、reason，可选 example。detectedIssues 中每个元素必须包含 severity、title、description，可选 spriteName，其中 severity 只能是 info 或 warning，绝不能使用 high、medium、low、critical 或其他值。不要输出 Markdown，不要输出额外解释。";
const HINT_ONLY_USER_PROMPT =
  "请根据下面的 Scratch 项目上下文，给出“下一步做什么”的提示。优先基于学生已经使用过的模块继续推进，不要让学生一下子大改，也不要直接泄露完整答案。";

interface GenerateCoachHintOptions {
  snapshot: ProjectSnapshot;
  currentTargetPrograms: string[];
  programAreaModules: ProgramAreaModule[];
  usedExtensions: string[];
  loadedExtensions: string[];
  goal?: string;
  aiConfig: LoadedDeepSeekConfig;
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
    return "还没有读取到当前角色的模块使用情况";
  }

  return programAreaModules
    .slice(0, 5)
    .map((module) => `${module.label}×${module.blockCount}`)
    .join("、");
}

function buildFallbackCoachResponse(options: GenerateCoachHintOptions): CoachResponse {
  const { snapshot, currentTargetPrograms, programAreaModules, goal } = options;
  const currentTarget = snapshot.currentTarget || "当前角色";
  const currentSprite = getCurrentTargetSprite(snapshot);
  const opcodes = getCurrentTargetOpcodes(snapshot);
  const recommendedBlocks: RecommendedBlock[] = [];
  const detectedIssues: CoachResponse["detectedIssues"] = [];

  let nextStep = `先为 ${currentTarget} 补一个更明确的互动效果。`;
  let answerText = `我看到 ${currentTarget} 现在主要用了 ${describeModules(programAreaModules)}。建议先把现有脚本做成一个更稳定、能重复演示的小功能。`;
  let followUpQuestion = "你希望这个角色下一步对什么做出反应，比如按键、碰撞还是计分？";

  nextStep = `先围绕 ${currentTarget} 补一个更清楚的互动目标。`;
  answerText = `我看到 ${currentTarget} 现在主要用了 ${describeModules(programAreaModules)}。下一步先收紧范围，只补一个小功能，让学生能自己继续往下搭。`;

  if (currentTargetPrograms.length === 0 || !currentSprite || currentSprite.blockCount === 0) {
    nextStep = `先给 ${currentTarget} 做一个最小可运行脚本：当绿旗被点击后移动，再说一句话。`;
    answerText = goal
      ? `我还没有看到 ${currentTarget} 的完整脚本。先做一个最小版本来靠近“${goal}”，这样后面再继续扩展会更稳。`
      : `我还没有看到 ${currentTarget} 的完整脚本。先做一个最小版本，让角色先能动起来、说一句话，再继续往下加。`;
    nextStep = `先想一想：这个角色最先需要“开始触发”“明显动作”还是“可见反馈”？只补其中最缺的一块。`;
    answerText = goal
      ? `我还没有看到 ${currentTarget} 的完整脚本。先挑一个最小步骤，往“${goal}”靠近一点点，不要一次把整套做完。`
      : `我还没有看到 ${currentTarget} 的完整脚本。先补一个最容易验证的局部效果，让学生自己观察还缺哪一块。`;

    recommendedBlocks.push(
      createRecommendedBlock(
        "event_whenflagclicked",
        "事件",
        "当绿旗被点击",
        "给脚本一个明确的开始时机。"
      ),
      createRecommendedBlock(
        "motion_movesteps",
        "运动",
        "移动 10 步",
        "先让角色产生最直观的动作反馈。"
      ),
      createRecommendedBlock(
        "looks_sayforsecs",
        "外观",
        "说 2 秒",
        "让学生更容易看出脚本已经被触发。",
        "比如：'我开始执行啦！'"
      )
    );
    detectedIssues.push({
      severity: "info",
      title: "当前角色还没有完整脚本",
      description: "建议先做一个能立即运行的小脚本，再继续添加更复杂的规则。",
      spriteName: currentTarget
    });
    followUpQuestion = "你想让角色先动起来，还是先说话、换造型？";
  } else if (!hasOpcodePrefix(opcodes, "event_")) {
    nextStep = `先补一个事件积木，把现有动作接到“当绿旗被点击”或“当按下某键”后面。`;
    answerText = `现在 ${currentTarget} 已经有动作想法了，但缺少明确的触发时机。先补事件，学生会更容易理解“什么时候开始执行”。`;
    recommendedBlocks.push(
      createRecommendedBlock(
        "event_whenflagclicked",
        "事件",
        "当绿旗被点击",
        "最适合给演示型作品做统一启动。"
      ),
      createRecommendedBlock(
        "event_whenkeypressed",
        "事件",
        "当按下空格键",
        "适合做角色控制或互动触发。"
      ),
      createRecommendedBlock(
        "looks_sayforsecs",
        "外观",
        "说 2 秒",
        "触发后给一个可见反馈，便于调试。"
      )
    );
    detectedIssues.push({
      severity: "warning",
      title: "脚本触发条件不够清晰",
      description: "学生可能已经拼好了动作，但还缺少“什么时候开始”的事件积木。",
      spriteName: currentTarget
    });
    followUpQuestion = "你想让这个角色在绿旗点击时开始，还是在按键时开始？";
  } else if (!hasOpcodePrefix(opcodes, "control_repeat") && !hasOpcodePrefix(opcodes, "control_forever")) {
    nextStep = `把已有动作放进“重复执行”或“一直重复”里，让角色连续表现。`;
    answerText = `当前脚本已经能跑起来了，下一步最值得补的是循环。这样角色不会只做一次动作，作品会更像完整动画或游戏。`;
    recommendedBlocks.push(
      createRecommendedBlock(
        "control_repeat",
        "控制",
        "重复执行 10 次",
        "适合先做可控次数的测试。"
      ),
      createRecommendedBlock(
        "control_forever",
        "控制",
        "一直重复",
        "适合持续移动、持续检测或持续绘制。"
      ),
      createRecommendedBlock(
        "motion_turnright",
        "运动",
        "右转 15 度",
        "放进循环里更容易看出连续效果。"
      )
    );
    followUpQuestion = "如果把这段动作重复起来，你希望它一直循环，还是只循环几次？";
  } else if (hasModule(programAreaModules, "motion") && !hasModule(programAreaModules, "sensing")) {
    nextStep = `在现有动作外面加一个侦测条件，让角色能根据环境改变行为。`;
    answerText = `现在 ${currentTarget} 已经会动了，最适合继续补“侦测”。这样学生就能从“会动”进阶到“会判断、会互动”。`;
    recommendedBlocks.push(
      createRecommendedBlock(
        "sensing_touchingobject",
        "侦测",
        "碰到 [边缘 v] ?",
        "让角色开始根据环境做判断。"
      ),
      createRecommendedBlock(
        "control_if",
        "控制",
        "如果 那么",
        "把侦测结果转成真正的行为变化。"
      ),
      createRecommendedBlock(
        "motion_ifonedgebounce",
        "运动",
        "碰到边缘就反弹",
        "适合快速做出看得见的互动结果。"
      )
    );
    followUpQuestion = "你希望角色碰到边缘、鼠标，还是另一个角色时发生变化？";
  } else if (!hasModule(programAreaModules, "data")) {
    nextStep = `加一个变量，例如“分数”或“时间”，把作品从演示推进到游戏规则。`;
    answerText = `当前脚本已经不只是单纯动作了。下一步可以加变量，让学生开始理解“状态”会随着事件变化。`;
    recommendedBlocks.push(
      createRecommendedBlock(
        "data_setvariableto",
        "变量和列表",
        "将 [分数 v] 设为 0",
        "先初始化规则里最核心的变量。"
      ),
      createRecommendedBlock(
        "data_changevariableby",
        "变量和列表",
        "将 [分数 v] 增加 1",
        "每次完成动作或碰撞时更新结果。"
      ),
      createRecommendedBlock(
        "looks_sayforsecs",
        "外观",
        "说 2 秒",
        "变量变化后给一个可见反馈，方便调试。"
      )
    );
    followUpQuestion = "如果这是一个小游戏，你最想先记录分数、时间，还是生命值？";
  } else if (hasModule(programAreaModules, "pen")) {
    nextStep = `把画笔动作和循环、转向组合起来，试着画一个有规律的图形。`;
    answerText = `你现在已经用到了画笔模块，下一步最适合把“重复”和“转向”组合起来，让图案更明显。`;
    recommendedBlocks.push(
      createRecommendedBlock(
        "pen_penDown",
        "画笔",
        "落笔",
        "让移动真正留下轨迹。"
      ),
      createRecommendedBlock(
        "control_repeat",
        "控制",
        "重复执行 4 次",
        "规则图形最适合从固定次数循环开始。"
      ),
      createRecommendedBlock(
        "motion_turnright",
        "运动",
        "右转 90 度",
        "和画笔结合可以快速画出方形、矩形。"
      )
    );
    followUpQuestion = "你想让角色先画方形、三角形，还是画一条有规律的路线？";
  } else {
    nextStep = `在现有脚本基础上补一个“如果……那么……”判断，让角色学会根据情况切换行为。`;
    answerText = `这个项目已经有基础结构了。下一步建议不要一下子加太多，而是在现有动作外面加一层条件判断，让行为更像真实游戏规则。`;
    recommendedBlocks.push(
      createRecommendedBlock(
        "control_if",
        "控制",
        "如果 那么",
        "让角色开始区分不同情况。"
      ),
      createRecommendedBlock(
        "operator_equals",
        "运算",
        "= ",
        "适合配合变量或侦测结果判断。"
      ),
      createRecommendedBlock(
        "looks_switchcostumeto",
        "外观",
        "切换造型为",
        "判断成立时给一个明显反馈。"
      )
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

function buildPromptContext(options: GenerateCoachHintOptions) {
  const { snapshot, currentTargetPrograms, programAreaModules, usedExtensions, loadedExtensions, goal } = options;
  const currentTarget = getCurrentTargetSprite(snapshot);

  const compactSprites = snapshot.sprites.slice(0, 8).map((sprite: SpriteSnapshot) => ({
    name: sprite.name,
    isStage: sprite.isStage,
    blockCount: sprite.blockCount,
    variables: sprite.variables.map((variable) => variable.name),
    scripts:
      sprite.name === currentTarget?.name
        ? sprite.scripts.map((script) => script.blockSequence)
        : sprite.scripts.slice(0, 2).map((script) => script.blockSequence)
  }));

  return {
    goal: goal?.trim() || snapshot.goal || "",
    currentTarget: snapshot.currentTarget || "",
    currentTargetPrograms,
    programAreaModules,
    usedExtensions,
    loadedExtensions,
    detectedConcepts: snapshot.detectedConcepts,
    sprites: compactSprites,
    globalVariables: snapshot.globalVariables.map((variable) => ({
      name: variable.name,
      value: variable.value
    }))
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
          const label =
            normalizeTextValue(item.label) ??
            normalizeTextValue(item.blockName) ??
            opcode;
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
    const normalizedOptions = {
      ...options,
      snapshot
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
              content:
                "你是 Scratch 小学编程助教。请根据学生当前作品，给出非常具体、可执行、面向小学生的中文提示。输出必须是一个 JSON 对象，字段只能包含 answerText、recommendedBlocks、nextStep、detectedIssues、followUpQuestion。recommendedBlocks 中每个元素必须包含 opcode、category、label、reason，可选 example。detectedIssues 中每个元素必须包含 severity、title、description，可选 spriteName，其中 severity 只能是 info 或 warning。不要输出 Markdown，不要输出额外解释。"
            },
            {
              role: "user",
              content: `请根据下面的 Scratch 项目上下文，给出“下一步做什么”的提示。优先基于学生已经使用过的模块继续推进，不要让学生一下子大改。\n\n${JSON.stringify(promptContext, null, 2)}`
            }
          ],
          messages: [
            {
              role: "system",
              content: HINT_ONLY_SYSTEM_PROMPT
            },
            {
              role: "user",
              content: `${HINT_ONLY_USER_PROMPT}\n\n${JSON.stringify(promptContext, null, 2)}`
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
