import test from "node:test";
import assert from "node:assert/strict";

import {
  formatAiStatus,
  formatDefaultDetail,
  formatDefaultNextStep,
  formatCurrentTarget,
  formatCurrentTargetPrograms,
  formatRecommendedBlocks,
  renderList,
  renderState
} from "../dist/renderer-view.js";

function createFakeDocument() {
  return {
    createElement() {
      return createFakeListElement();
    }
  };
}

function createFakeListElement() {
  return {
    textContent: "",
    className: "",
    hidden: false,
    dataset: {},
    children: [],
    replaceChildren(...children) {
      this.children = [...children];
    },
    append(child) {
      this.children.push(child);
    }
  };
}

test("formats current target with stage label", () => {
  assert.equal(
    formatCurrentTarget({
      currentTargetName: "Stage",
      currentTargetIsStage: true
    }),
    "Stage（舞台）"
  );
  assert.equal(formatCurrentTarget({}), "未识别");
});

test("formats current target programs with script labels", () => {
  assert.deepEqual(
    formatCurrentTargetPrograms([
      "当绿旗被点击 -> 一直重复 -> 移动 10 步",
      "当按下空格键 -> 说 2 秒"
    ]),
    [
      "脚本 1: 当绿旗被点击 -> 一直重复 -> 移动 10 步",
      "脚本 2: 当按下空格键 -> 说 2 秒"
    ]
  );
});

test("formats recommended blocks without exposing English opcodes", () => {
  assert.deepEqual(
    formatRecommendedBlocks({
      aiCoachResponse: {
        recommendedBlocks: [
          {
            opcode: "event_whenflagclicked",
            category: "事件",
            label: "当绿旗被点击",
            reason: "先给脚本一个开始时机。"
          }
        ]
      }
    }),
    ["事件 / 当绿旗被点击：先给脚本一个开始时机。"]
  );
});

test("formats default detail and next step for the new scratch-first flow", () => {
  assert.equal(
    formatDefaultDetail({}),
    "先选择本机的 Scratch 软件；选过一次后，之后会继续使用这个路径。"
  );
  assert.equal(
    formatDefaultDetail({
      scratchExecutablePath: "C:\\Scratch 3.exe"
    }),
    "已经记住上次选择的 Scratch 软件了。现在点“打开已选 Scratch”即可继续使用。"
  );
  assert.equal(
    formatDefaultNextStep({}),
    "先选择 Scratch 软件。"
  );
  assert.equal(
    formatDefaultNextStep({
      scratchExecutablePath: "C:\\Scratch 3.exe"
    }),
    "点击“打开已选 Scratch”。"
  );
  assert.equal(
    formatDefaultNextStep({
      status: "connected"
    }),
    "先看当前提示完成这一小步；学生补完后，再点击“生成下一步提示”。"
  );
});

test("formats local-only AI guidance without teacher sb3 wording", () => {
  assert.equal(
    formatDefaultDetail({
      status: "connected"
    }),
    "Scratch 已连接。现在可以直接读取当前作品，并生成下一步提示。"
  );
  assert.equal(
    formatAiStatus({
      status: "connected"
    }),
    "Scratch 已连接。点击“生成下一步提示”后，我会基于当前作品给出下一步建议。"
  );
});

test("renderList renders an empty item when no data is available", () => {
  const container = createFakeListElement();
  renderList(createFakeDocument(), container, [], "空列表");

  assert.equal(container.children.length, 1);
  assert.equal(container.children[0].textContent, "空列表");
  assert.equal(container.children[0].className, "empty");
});

test("renderState updates current role and program text", () => {
  const documentRef = createFakeDocument();
  const statusElement = createFakeListElement();
  const detailElement = createFakeListElement();
  const currentTargetElement = createFakeListElement();
  const updatedAtElement = createFakeListElement();
  const statusSummaryElement = createFakeListElement();
  const currentTargetProgramsElement = createFakeListElement();
  const errorElement = createFakeListElement();
  const scratchPathElement = createFakeListElement();

  renderState(
    {
      status: "connected",
      statusText: "已连接到 Scratch Desktop",
      detail: "来自测试",
      currentTargetName: "Cat",
      currentTargetPrograms: [
        "当绿旗被点击 -> 一直重复 -> 移动 10 步 -> 清空"
      ],
      toolboxCategories: [],
      usedExtensions: [],
      loadedExtensions: [],
      programAreaModules: [],
      scratchExecutablePath: "C:\\Scratch 3.exe"
    },
    {
      documentRef,
      statusElement,
      detailElement,
      currentTargetElement,
      updatedAtElement,
      statusSummaryElement,
      currentTargetProgramsElement,
      errorElement,
      scratchPathElement
    }
  );

  assert.equal(statusElement.textContent, "已连接到 Scratch Desktop");
  assert.equal(statusSummaryElement.textContent, "已连接到 Scratch Desktop");
  assert.equal(currentTargetElement.textContent, "Cat");
  assert.deepEqual(
    currentTargetProgramsElement.children.map((child) => child.textContent),
    ["脚本 1: 当绿旗被点击 -> 一直重复 -> 移动 10 步 -> 清空"]
  );
  assert.equal(scratchPathElement.textContent, "C:\\Scratch 3.exe");
});
