import test from "node:test";
import assert from "node:assert/strict";

import {
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
