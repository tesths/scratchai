import type { RecommendedBlock } from "./types";

const XML_NAMESPACE = "https://developers.google.com/blockly/xml";
const SCALAR_VARIABLE_TYPE = "";
const LIST_VARIABLE_TYPE = "list";
const BROADCAST_VARIABLE_TYPE = "broadcast_msg";
const STATEMENT_INPUT_NAMES = new Set(["SUBSTACK", "SUBSTACK2"]);

type PrimitiveInput = [number, ...unknown[]];

interface ScratchBlockInputRef {
  kind: "block-id" | "primitive";
  value: string | PrimitiveInput;
}

interface ScratchVariableDescriptor {
  id: string;
  name: string;
  type: string;
  isLocal: boolean;
  isCloud: boolean;
}

interface ScratchBlockRecord {
  opcode?: unknown;
  next?: unknown;
  parent?: unknown;
  inputs?: Record<string, unknown>;
  fields?: Record<string, unknown>;
  shadow?: unknown;
  topLevel?: unknown;
  mutation?: Record<string, unknown>;
  x?: unknown;
  y?: unknown;
}

interface ScratchTargetRecord {
  id?: unknown;
  name?: unknown;
  isStage?: unknown;
  blocks?: Record<string, ScratchBlockRecord>;
  variables?: Record<string, unknown>;
  lists?: Record<string, unknown>;
  broadcasts?: Record<string, unknown>;
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asTargetList(projectData: unknown) {
  if (!projectData || typeof projectData !== "object" || !Array.isArray((projectData as { targets?: unknown[] }).targets)) {
    return [];
  }

  return (projectData as { targets: ScratchTargetRecord[] }).targets;
}

function isBlockRecord(block: unknown): block is ScratchBlockRecord {
  return Boolean(block) && typeof block === "object";
}

function getBlockMap(target: ScratchTargetRecord | undefined) {
  if (!target?.blocks || typeof target.blocks !== "object") {
    return {} as Record<string, ScratchBlockRecord>;
  }

  return target.blocks;
}

function pickCurrentTarget(
  projectData: unknown,
  currentTargetMeta?: { id?: string; name?: string }
) {
  const targets = asTargetList(projectData);
  const targetId = normalizeString(currentTargetMeta?.id);
  if (targetId) {
    const matchedTarget = targets.find((target) => normalizeString(target?.id) === targetId);
    if (matchedTarget) {
      return matchedTarget;
    }
  }

  const targetName = normalizeString(currentTargetMeta?.name);
  if (targetName) {
    const matchedTarget = targets.find((target) => normalizeString(target?.name) === targetName);
    if (matchedTarget) {
      return matchedTarget;
    }
  }

  return targets.find((target) => !Boolean(target?.isStage));
}

function getNumericSortValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function getTopLevelScriptIds(blocks: Record<string, ScratchBlockRecord>) {
  return Object.entries(blocks)
    .filter(([, block]) => {
      if (!isBlockRecord(block)) {
        return false;
      }

      return typeof block.opcode === "string" && block.shadow !== true && block.topLevel === true;
    })
    .sort((left, right) => {
      const yDiff = getNumericSortValue(left[1].y) - getNumericSortValue(right[1].y);
      if (yDiff !== 0) {
        return yDiff;
      }

      const xDiff = getNumericSortValue(left[1].x) - getNumericSortValue(right[1].x);
      if (xDiff !== 0) {
        return xDiff;
      }

      return left[0].localeCompare(right[0], "zh-CN");
    })
    .map(([blockId]) => blockId);
}

function collectWorkspaceVariables(projectData: unknown) {
  const descriptors: ScratchVariableDescriptor[] = [];
  const seenIds = new Set<string>();

  for (const target of asTargetList(projectData)) {
    const isLocal = !Boolean(target?.isStage);
    const variableEntries = target?.variables && typeof target.variables === "object" ? Object.entries(target.variables) : [];
    for (const [id, entry] of variableEntries) {
      if (seenIds.has(id) || !Array.isArray(entry) || entry.length < 2) {
        continue;
      }

      descriptors.push({
        id,
        name: String(entry[0] ?? ""),
        type: SCALAR_VARIABLE_TYPE,
        isLocal,
        isCloud: Boolean(entry[2])
      });
      seenIds.add(id);
    }

    const listEntries = target?.lists && typeof target.lists === "object" ? Object.entries(target.lists) : [];
    for (const [id, entry] of listEntries) {
      if (seenIds.has(id) || !Array.isArray(entry) || entry.length < 1) {
        continue;
      }

      descriptors.push({
        id,
        name: String(entry[0] ?? ""),
        type: LIST_VARIABLE_TYPE,
        isLocal,
        isCloud: false
      });
      seenIds.add(id);
    }

    if (target?.isStage !== true || !target.broadcasts || typeof target.broadcasts !== "object") {
      continue;
    }

    for (const [id, name] of Object.entries(target.broadcasts)) {
      if (seenIds.has(id)) {
        continue;
      }

      descriptors.push({
        id,
        name: String(name ?? ""),
        type: BROADCAST_VARIABLE_TYPE,
        isLocal: false,
        isCloud: false
      });
      seenIds.add(id);
    }
  }

  return descriptors;
}

function buildVariablesXml(projectData: unknown) {
  const variables = collectWorkspaceVariables(projectData);
  if (variables.length === 0) {
    return "";
  }

  return `<variables>${variables
    .map(
      (variable) =>
        `<variable type="${escapeXml(variable.type)}" id="${escapeXml(variable.id)}" islocal="${variable.isLocal ? "true" : "false"}" iscloud="${variable.isCloud ? "true" : "false"}">${escapeXml(variable.name)}</variable>`
    )
    .join("")}</variables>`;
}

function getFieldText(rawField: unknown) {
  if (Array.isArray(rawField)) {
    return String(rawField[0] ?? "");
  }

  if (rawField && typeof rawField === "object") {
    if ("value" in rawField) {
      return String((rawField as { value?: unknown }).value ?? "");
    }
    if ("name" in rawField) {
      return String((rawField as { name?: unknown }).name ?? "");
    }
  }

  return String(rawField ?? "");
}

function getFieldAttributes(opcode: string, fieldName: string, rawField: unknown) {
  const attributes: Record<string, string> = {};
  if (Array.isArray(rawField) && typeof rawField[1] === "string") {
    if (fieldName === "VARIABLE") {
      attributes.id = rawField[1];
      attributes.variabletype = SCALAR_VARIABLE_TYPE;
    }
    if (fieldName === "LIST") {
      attributes.id = rawField[1];
      attributes.variabletype = LIST_VARIABLE_TYPE;
    }
    if (
      fieldName === "BROADCAST_OPTION" &&
      (opcode === "event_whenbroadcastreceived" || opcode === "event_broadcast_menu")
    ) {
      attributes.id = rawField[1];
      attributes.variabletype = BROADCAST_VARIABLE_TYPE;
    }
  }
  return attributes;
}

function buildFieldXml(name: string, value: unknown, attributes: Record<string, string> = {}) {
  const serializedAttributes = Object.entries(attributes)
    .map(([attributeName, attributeValue]) => ` ${attributeName}="${escapeXml(attributeValue)}"`)
    .join("");
  return `<field name="${escapeXml(name)}"${serializedAttributes}>${escapeXml(value)}</field>`;
}

function buildElementXml(
  tagName: string,
  blockType: string,
  body: string,
  attributes: Record<string, string> = {}
) {
  const serializedAttributes = Object.entries(attributes)
    .map(([attributeName, attributeValue]) => ` ${attributeName}="${escapeXml(attributeValue)}"`)
    .join("");
  return `<${tagName} type="${escapeXml(blockType)}"${serializedAttributes}>${body}</${tagName}>`;
}

function buildValueShadowXml(
  inputName: string,
  shadowType: string,
  fieldName: string,
  fieldValue: unknown,
  fieldAttributes: Record<string, string> = {}
) {
  return `<value name="${escapeXml(inputName)}">${buildElementXml(
    "shadow",
    shadowType,
    buildFieldXml(fieldName, fieldValue, fieldAttributes)
  )}</value>`;
}

function createInputReference(value: unknown, blocks: Record<string, ScratchBlockRecord>): ScratchBlockInputRef | null {
  if (typeof value === "string" && blocks[value]) {
    return {
      kind: "block-id",
      value
    };
  }

  if (Array.isArray(value) && typeof value[0] === "number") {
    return {
      kind: "primitive",
      value: value as PrimitiveInput
    };
  }

  return null;
}

function parseInputReferences(rawInput: unknown, blocks: Record<string, ScratchBlockRecord>) {
  if (!Array.isArray(rawInput) || rawInput.length < 2) {
    return null;
  }

  const shadowState = Number(rawInput[0]);
  const primary = createInputReference(rawInput[1], blocks);
  const secondary = createInputReference(rawInput[2], blocks);

  if (shadowState === 1) {
    return {
      block: null,
      shadow: primary
    };
  }

  if (shadowState === 2) {
    return {
      block: primary,
      shadow: null
    };
  }

  if (shadowState === 3) {
    return {
      block: primary,
      shadow: secondary
    };
  }

  const refs = rawInput.slice(1).map((value) => createInputReference(value, blocks)).filter(Boolean);
  return {
    block: refs.find((ref) => ref?.kind === "block-id") ?? refs[0] ?? null,
    shadow: refs.find((ref) => ref?.kind === "primitive") ?? null
  };
}

function buildPrimitiveInputXml(primitive: PrimitiveInput, tagName: "block" | "shadow") {
  const inputType = Number(primitive[0]);
  switch (inputType) {
    case 4:
      return buildElementXml(tagName, "math_number", buildFieldXml("NUM", primitive[1] ?? "0"));
    case 5:
      return buildElementXml(tagName, "math_positive_number", buildFieldXml("NUM", primitive[1] ?? "1"));
    case 6:
      return buildElementXml(tagName, "math_whole_number", buildFieldXml("NUM", primitive[1] ?? "1"));
    case 7:
      return buildElementXml(tagName, "math_integer", buildFieldXml("NUM", primitive[1] ?? "1"));
    case 8:
      return buildElementXml(tagName, "math_angle", buildFieldXml("NUM", primitive[1] ?? "90"));
    case 9:
      return buildElementXml(tagName, "colour_picker", buildFieldXml("COLOUR", primitive[1] ?? "#ff6680"));
    case 10:
      return buildElementXml(tagName, "text", buildFieldXml("TEXT", primitive[1] ?? ""));
    case 11:
      return buildElementXml(
        tagName,
        "event_broadcast_menu",
        buildFieldXml("BROADCAST_OPTION", primitive[1] ?? "", {
          id: String(primitive[2] ?? ""),
          variabletype: BROADCAST_VARIABLE_TYPE
        })
      );
    case 12:
      return buildElementXml(
        tagName,
        "data_variable",
        buildFieldXml("VARIABLE", primitive[1] ?? "", {
          id: String(primitive[2] ?? ""),
          variabletype: SCALAR_VARIABLE_TYPE
        })
      );
    case 13:
      return buildElementXml(
        tagName,
        "data_listcontents",
        buildFieldXml("LIST", primitive[1] ?? "", {
          id: String(primitive[2] ?? ""),
          variabletype: LIST_VARIABLE_TYPE
        })
      );
    default:
      return buildElementXml(tagName, "text", buildFieldXml("TEXT", primitive[1] ?? ""));
  }
}

function buildMutationXml(mutation: unknown): string {
  if (!mutation || typeof mutation !== "object") {
    return "";
  }

  const mutationRecord = mutation as Record<string, unknown>;
  const tagName = normalizeString(mutationRecord.tagName) || "mutation";
  const attributes = Object.entries(mutationRecord)
    .filter(([key, value]) => key !== "tagName" && key !== "children" && key !== "textContent" && value !== undefined)
    .map(([key, value]) => ` ${key}="${escapeXml(value)}"`)
    .join("");
  const textContent = mutationRecord.textContent === undefined ? "" : escapeXml(mutationRecord.textContent);
  const children = Array.isArray(mutationRecord.children)
    ? mutationRecord.children.map((child) => buildMutationXml(child)).join("")
    : "";
  return `<${tagName}${attributes}>${textContent}${children}</${tagName}>`;
}

function buildReferenceXml(
  ref: ScratchBlockInputRef | null,
  blocks: Record<string, ScratchBlockRecord>,
  visited: Set<string>,
  asShadow = false
) {
  if (!ref) {
    return "";
  }

  if (ref.kind === "primitive") {
    return buildPrimitiveInputXml(ref.value as PrimitiveInput, asShadow ? "shadow" : "block");
  }

  return buildBlockXml(ref.value as string, blocks, visited, asShadow);
}

function buildInputXml(
  blockOpcode: string,
  inputName: string,
  rawInput: unknown,
  blocks: Record<string, ScratchBlockRecord>,
  visited: Set<string>
) {
  const refs = parseInputReferences(rawInput, blocks);
  if (!refs) {
    return "";
  }

  if (STATEMENT_INPUT_NAMES.has(inputName)) {
    const statementXml = buildReferenceXml(refs.block ?? refs.shadow, blocks, visited);
    return statementXml ? `<statement name="${escapeXml(inputName)}">${statementXml}</statement>` : "";
  }

  const shadowXml = buildReferenceXml(refs.shadow, blocks, visited, true);
  const blockXml = buildReferenceXml(refs.block, blocks, visited);
  const innerXml = `${shadowXml}${blockXml}`;
  if (!innerXml) {
    return "";
  }

  return `<value name="${escapeXml(inputName)}">${innerXml}</value>`;
}

function buildBlockXml(
  blockId: string,
  blocks: Record<string, ScratchBlockRecord>,
  visited: Set<string>,
  asShadow = false
): string {
  if (visited.has(blockId)) {
    return "";
  }

  const block = blocks[blockId];
  if (!isBlockRecord(block) || typeof block.opcode !== "string") {
    return "";
  }

  visited.add(blockId);

  const body: string[] = [];
  const mutationXml = buildMutationXml(block.mutation);
  if (mutationXml) {
    body.push(mutationXml);
  }

  if (block.fields && typeof block.fields === "object") {
    for (const [fieldName, rawField] of Object.entries(block.fields)) {
      body.push(buildFieldXml(fieldName, getFieldText(rawField), getFieldAttributes(block.opcode, fieldName, rawField)));
    }
  }

  if (block.inputs && typeof block.inputs === "object") {
    for (const [inputName, rawInput] of Object.entries(block.inputs)) {
      const inputXml = buildInputXml(block.opcode, inputName, rawInput, blocks, visited);
      if (inputXml) {
        body.push(inputXml);
      }
    }
  }

  if (!asShadow && typeof block.next === "string") {
    const nextXml = buildBlockXml(block.next, blocks, visited);
    if (nextXml) {
      body.push(`<next>${nextXml}</next>`);
    }
  }

  return buildElementXml(asShadow || block.shadow === true ? "shadow" : "block", block.opcode, body.join(""));
}

function wrapWorkspaceXml(blockXml: string, variablesXml = "") {
  return `<xml xmlns="${XML_NAMESPACE}">${variablesXml}${blockXml}</xml>`;
}

function buildRecommendedBlockBody(block: RecommendedBlock) {
  const messageText = block.example || "开始吧";

  switch (block.opcode) {
    case "motion_movesteps":
      return buildElementXml("block", block.opcode, buildValueShadowXml("STEPS", "math_number", "NUM", "10"));
    case "motion_turnright":
    case "motion_turnleft":
      return buildElementXml("block", block.opcode, buildValueShadowXml("DEGREES", "math_angle", "NUM", "15"));
    case "motion_pointindirection":
      return buildElementXml("block", block.opcode, buildValueShadowXml("DIRECTION", "math_angle", "NUM", "90"));
    case "motion_gotoxy":
      return buildElementXml(
        "block",
        block.opcode,
        `${buildValueShadowXml("X", "math_number", "NUM", "0")}${buildValueShadowXml("Y", "math_number", "NUM", "0")}`
      );
    case "looks_say":
    case "looks_think":
      return buildElementXml("block", block.opcode, buildValueShadowXml("MESSAGE", "text", "TEXT", messageText));
    case "looks_sayforsecs":
    case "looks_thinkforsecs":
      return buildElementXml(
        "block",
        block.opcode,
        `${buildValueShadowXml("MESSAGE", "text", "TEXT", messageText)}${buildValueShadowXml("SECS", "math_number", "NUM", "2")}`
      );
    case "control_wait":
      return buildElementXml("block", block.opcode, buildValueShadowXml("DURATION", "math_positive_number", "NUM", "1"));
    case "control_repeat":
      return buildElementXml(
        "block",
        block.opcode,
        `${buildValueShadowXml("TIMES", "math_whole_number", "NUM", "10")}<statement name="SUBSTACK">${buildElementXml("block", "motion_movesteps", buildValueShadowXml("STEPS", "math_number", "NUM", "10"))}</statement>`
      );
    case "control_forever":
      return buildElementXml(
        "block",
        block.opcode,
        `<statement name="SUBSTACK">${buildElementXml("block", "motion_movesteps", buildValueShadowXml("STEPS", "math_number", "NUM", "10"))}</statement>`
      );
    default:
      return buildElementXml("block", block.opcode, "");
  }
}

export function buildCurrentTargetScriptXmlList(
  projectData: unknown,
  currentTargetMeta?: { id?: string; name?: string }
) {
  const target = pickCurrentTarget(projectData, currentTargetMeta);
  if (!target) {
    return [];
  }

  const blocks = getBlockMap(target);
  const variablesXml = buildVariablesXml(projectData);

  return getTopLevelScriptIds(blocks)
    .map((blockId) => {
      const blockXml = buildBlockXml(blockId, blocks, new Set<string>());
      return blockXml ? wrapWorkspaceXml(blockXml, variablesXml) : "";
    })
    .filter(Boolean);
}

export function buildRecommendedBlockXml(block: RecommendedBlock) {
  return wrapWorkspaceXml(buildRecommendedBlockBody(block));
}
