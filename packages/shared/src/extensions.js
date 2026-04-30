const CORE_EXTENSION_PREFIXES = new Set([
  "argument",
  "colour",
  "control",
  "data",
  "event",
  "looks",
  "math",
  "motion",
  "operator",
  "procedures",
  "sensing",
  "sound"
]);

const CORE_PROGRAM_AREA_MODULE_LABELS = {
  motion: "运动",
  looks: "外观",
  sound: "声音",
  event: "事件",
  control: "控制",
  sensing: "侦测",
  operator: "运算",
  data: "变量和列表",
  procedures: "自制积木",
  argument: "自制积木",
  colour: "颜色",
  math: "运算"
};

const EXTENSION_PROGRAM_AREA_MODULE_LABELS = {
  boost: "BOOST",
  ev3: "EV3",
  gdxfor: "Go Direct Force & Acceleration",
  makeymakey: "Makey Makey",
  mesh: "Mesh",
  microbit: "micro:bit",
  music: "音乐",
  pen: "画笔",
  text2speech: "文字转语音",
  translate: "翻译",
  videoSensing: "视频侦测",
  wedo2: "WeDo 2.0"
};

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function uniqueSortedStrings(values) {
  return Array.from(
    new Set(
      (values ?? [])
        .map(normalizeString)
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right, "zh-CN"));
}

function normalizeExtensionId(prefix) {
  const normalized = normalizeString(String(prefix ?? "")).replace(/[^\w-]/g, "-");
  if (!normalized || CORE_EXTENSION_PREFIXES.has(normalized)) {
    return null;
  }
  return normalized;
}

function getOpcodePrefix(opcode) {
  if (typeof opcode !== "string") {
    return null;
  }
  const separatorIndex = opcode.indexOf("_");
  if (separatorIndex <= 0) {
    return null;
  }
  return opcode.slice(0, separatorIndex);
}

function getExtensionIdForOpcode(opcode) {
  const prefix = getOpcodePrefix(opcode);
  return prefix ? normalizeExtensionId(prefix) : null;
}

function getModuleIdForOpcode(opcode) {
  const prefix = getOpcodePrefix(opcode);
  if (!prefix) {
    return null;
  }
  if (prefix === "argument") {
    return "procedures";
  }
  if (prefix === "math") {
    return "operator";
  }
  if (prefix === "colour") {
    return "colour";
  }
  return CORE_EXTENSION_PREFIXES.has(prefix) ? prefix : normalizeExtensionId(prefix);
}

function getModuleLabelForId(moduleId) {
  if (!moduleId) {
    return null;
  }
  return (
    CORE_PROGRAM_AREA_MODULE_LABELS[moduleId] ??
    EXTENSION_PROGRAM_AREA_MODULE_LABELS[moduleId] ??
    moduleId
  );
}

function getUsedExtensionsFromBlocks(blocks) {
  if (!blocks || typeof blocks !== "object") {
    return [];
  }
  const used = new Set();
  for (const block of Object.values(blocks)) {
    const extensionId = getExtensionIdForOpcode(block?.opcode);
    if (extensionId) {
      used.add(extensionId);
    }
  }
  return uniqueSortedStrings(Array.from(used));
}

function getUsedExtensionsFromProject(project) {
  const used = new Set();
  for (const target of project?.targets ?? []) {
    for (const extensionId of getUsedExtensionsFromBlocks(target?.blocks)) {
      used.add(extensionId);
    }
  }
  for (const monitor of project?.monitors ?? []) {
    const extensionId = getExtensionIdForOpcode(monitor?.opcode);
    if (extensionId) {
      used.add(extensionId);
    }
  }
  for (const extensionId of project?.extensions ?? []) {
    const normalized = normalizeExtensionId(extensionId);
    if (normalized) {
      used.add(normalized);
    }
  }
  return uniqueSortedStrings(Array.from(used));
}

function shouldCountProgramAreaBlock(block) {
  return Boolean(block && typeof block.opcode === "string" && block.shadow !== true);
}

function summarizeProgramAreaModulesFromBlocks(blocks) {
  if (!blocks || typeof blocks !== "object") {
    return [];
  }
  const counts = new Map();
  for (const block of Object.values(blocks)) {
    if (!shouldCountProgramAreaBlock(block)) {
      continue;
    }
    const moduleId = getModuleIdForOpcode(block.opcode);
    if (!moduleId) {
      continue;
    }
    counts.set(moduleId, (counts.get(moduleId) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([id, blockCount]) => ({
      id,
      label: getModuleLabelForId(id) ?? id,
      blockCount
    }))
    .sort((left, right) => {
      if (right.blockCount !== left.blockCount) {
        return right.blockCount - left.blockCount;
      }
      return left.label.localeCompare(right.label, "zh-CN");
    });
}

function pickProjectTarget(project, currentTarget) {
  const targets = Array.isArray(project?.targets) ? project.targets : [];
  if (targets.length === 0) {
    return null;
  }

  const normalizedTarget = currentTarget && typeof currentTarget === "object" ? currentTarget : {};
  const candidateId = normalizeString(normalizedTarget.id);
  const candidateName = normalizeString(normalizedTarget.name);

  if (candidateId) {
    const byId = targets.find((target) => normalizeString(target?.id) === candidateId);
    if (byId) {
      return byId;
    }
  }

  if (candidateName) {
    const byName = targets.find((target) => normalizeString(target?.name) === candidateName);
    if (byName) {
      return byName;
    }
  }

  const firstSprite = targets.find((target) => target?.isStage === false);
  return firstSprite ?? targets[0];
}

function summarizeProgramAreaModulesFromTarget(target) {
  return summarizeProgramAreaModulesFromBlocks(target?.blocks);
}

function summarizeProgramAreaModulesFromProject(project, currentTarget) {
  const target = pickProjectTarget(project, currentTarget);
  return summarizeProgramAreaModulesFromTarget(target);
}

export {
  CORE_EXTENSION_PREFIXES,
  CORE_PROGRAM_AREA_MODULE_LABELS,
  EXTENSION_PROGRAM_AREA_MODULE_LABELS,
  getExtensionIdForOpcode,
  getModuleIdForOpcode,
  getModuleLabelForId,
  getUsedExtensionsFromBlocks,
  getUsedExtensionsFromProject,
  normalizeExtensionId,
  pickProjectTarget,
  summarizeProgramAreaModulesFromBlocks,
  summarizeProgramAreaModulesFromProject,
  summarizeProgramAreaModulesFromTarget,
  uniqueSortedStrings
};
