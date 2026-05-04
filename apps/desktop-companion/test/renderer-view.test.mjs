import test from "node:test";
import assert from "node:assert/strict";

import {
  formatDefaultDetail,
  formatDefaultNextStep,
  formatCurrentTarget,
  formatCurrentTargetPrograms,
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
      "event_whenflagclicked -> control_forever -> motion_movesteps",
      "event_whenkeypressed -> looks_say"
    ]),
    [
      "脚本 1: event_whenflagclicked -> control_forever -> motion_movesteps",
      "脚本 2: event_whenkeypressed -> looks_say"
    ]
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
    "下一步：先选择 Scratch 软件。"
  );
  assert.equal(
    formatDefaultNextStep({
      scratchExecutablePath: "C:\\Scratch 3.exe"
    }),
    "下一步：点击“打开已选 Scratch”。"
  );
  assert.equal(
    formatDefaultNextStep({
      status: "connected"
    }),
    "下一步：先看当前提示完成这一小步；学生补完后，再点击“更新下一步提示”。"
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
        "event_whenflagclicked -> control_forever -> motion_movesteps -> pen_clear"
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
      currentTargetProgramsElement,
      errorElement,
      scratchPathElement
    }
  );

  assert.equal(statusElement.textContent, "已连接到 Scratch Desktop");
  assert.equal(currentTargetElement.textContent, "Cat");
  assert.deepEqual(
    currentTargetProgramsElement.children.map((child) => child.textContent),
    ["脚本 1: event_whenflagclicked -> control_forever -> motion_movesteps -> pen_clear"]
  );
  assert.equal(scratchPathElement.textContent, "C:\\Scratch 3.exe");
});
