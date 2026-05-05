import test from "node:test";
import assert from "node:assert/strict";

import { SessionManager } from "../dist/session-manager.js";
import { StateStore } from "../dist/state-store.js";

function createBridgeServerMock() {
  return {
    handlers: { onPayload: null, onError: null },
    start: async () => {},
    stop: async () => {},
    getBaseUrl: () => "http://127.0.0.1:39000",
    getToken: () => "token",
    setHandlers(onPayload, onError) {
      this.handlers = { onPayload, onError };
    }
  };
}

function createAiConfigMock(overrides = {}) {
  return async () => ({
    configured: false,
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-v4-flash",
    timeoutMs: 20000,
    configPath: "C:\\config\\deepseek.config.json",
    customKeyConfigured: false,
    ...overrides
  });
}

function createConfigStoreMock(initialPath = undefined) {
  let scratchExecutablePath = initialPath;
  let customAiApiKey;
  let customAiPrompt;

  return {
    load: async () => ({
      ...(scratchExecutablePath ? { scratchExecutablePath } : {}),
      ...(customAiApiKey ? { customAiApiKey } : {}),
      ...(customAiPrompt ? { customAiPrompt } : {})
    }),
    saveScratchExecutablePath: async (value) => {
      scratchExecutablePath = value;
      return {
        ...(scratchExecutablePath ? { scratchExecutablePath } : {}),
        ...(customAiApiKey ? { customAiApiKey } : {}),
        ...(customAiPrompt ? { customAiPrompt } : {})
      };
    },
    saveCustomAiApiKey: async (value) => {
      customAiApiKey = value;
      return {
        ...(scratchExecutablePath ? { scratchExecutablePath } : {}),
        ...(customAiApiKey ? { customAiApiKey } : {}),
        ...(customAiPrompt ? { customAiPrompt } : {})
      };
    },
    clearCustomAiApiKey: async () => {
      customAiApiKey = undefined;
      return {
        ...(scratchExecutablePath ? { scratchExecutablePath } : {}),
        ...(customAiPrompt ? { customAiPrompt } : {})
      };
    },
    saveCustomAiPrompt: async (value) => {
      customAiPrompt = value;
      return {
        ...(scratchExecutablePath ? { scratchExecutablePath } : {}),
        ...(customAiApiKey ? { customAiApiKey } : {}),
        ...(customAiPrompt ? { customAiPrompt } : {})
      };
    },
    clearCustomAiPrompt: async () => {
      customAiPrompt = undefined;
      return {
        ...(scratchExecutablePath ? { scratchExecutablePath } : {}),
        ...(customAiApiKey ? { customAiApiKey } : {})
      };
    }
  };
}

function createImportedProjectResult(projectUrl = "https://example.com/reference.sb3") {
  const sharedModules = [
    { id: "event", label: "event", blockCount: 1 },
    { id: "control", label: "control", blockCount: 1 },
    { id: "sensing", label: "sensing", blockCount: 1 },
    { id: "data", label: "data", blockCount: 1 }
  ];

  return {
    sourceLabel: projectUrl,
    currentTargetName: "cheese",
    currentTargetIsStage: false,
    currentTargetPrograms: [
      "当绿旗被点击 -> 一直重复 -> 碰到对象？ -> 将变量增加"
    ],
    programAreaModules: sharedModules,
    usedExtensions: [],
    loadedExtensions: [],
    snapshot: {
      projectId: "fixture-project",
      currentTarget: "cheese",
      currentTargetId: "sprite-cheese",
      toolboxCategories: [],
      loadedExtensions: [],
      programAreaModules: sharedModules,
      sprites: [
        {
          name: "cheese",
          isStage: false,
          blockCount: 4,
          variables: [],
          scripts: [
          {
            spriteName: "cheese",
            event: "当绿旗被点击",
            blockSequence: [
              "当绿旗被点击",
              "一直重复",
              "碰到对象？",
              "将变量增加"
            ],
            blockOpcodes: [
              "event_whenflagclicked",
                "control_forever",
                "sensing_touchingobject",
                "data_changevariableby"
              ]
            }
          ]
        }
      ],
      blocks: [
        {
          id: "block-1",
          opcode: "event_whenflagclicked",
          category: "event",
          label: "when green flag clicked",
          spriteName: "cheese",
          topLevel: true
        }
      ],
      globalVariables: [],
      detectedConcepts: ["event", "control", "sensing", "data"],
      updatedAt: "2026-05-03T12:00:00.000Z"
    }
  };
}

test("SessionManager enters waiting state when Scratch path is not configured", async () => {
  const stateStore = new StateStore();
  const manager = new SessionManager(stateStore, {
    bridgeServer: createBridgeServerMock(),
    platform: "win32",
    log: () => {},
    configStore: createConfigStoreMock(),
    loadAiConfig: createAiConfigMock(),
    scratchLauncher: {},
    scratchRemoteDebugger: {}
  });

  await manager.start();

  const nextState = stateStore.getState();
  assert.equal(nextState.status, "waiting");
  assert.equal(nextState.scratchExecutablePath, undefined);
  assert.deepEqual(nextState.toolboxCategories, []);
  assert.deepEqual(nextState.usedExtensions, []);
  assert.deepEqual(nextState.loadedExtensions, []);
  assert.deepEqual(nextState.programAreaModules, []);
  assert.deepEqual(nextState.currentTargetPrograms, []);
  assert.equal(nextState.aiConfigured, false);
  assert.equal(nextState.aiCustomKeyConfigured, false);
  assert.equal(nextState.aiStatus, "idle");
  assert.equal(nextState.statusText, "请先选择 Scratch 软件");
  assert.equal(nextState.detail.includes("请先选择老师机上的 Scratch 软件"), true);
});

test("SessionManager supports macOS with the same waiting flow", async () => {
  const stateStore = new StateStore();
  const manager = new SessionManager(stateStore, {
    bridgeServer: createBridgeServerMock(),
    platform: "darwin",
    log: () => {},
    configStore: createConfigStoreMock("/Applications/Scratch.app/Contents/MacOS/Scratch"),
    loadAiConfig: createAiConfigMock(),
    scratchLauncher: {},
    scratchRemoteDebugger: {}
  });

  await manager.start();

  const nextState = stateStore.getState();
  assert.equal(nextState.status, "waiting");
  assert.equal(nextState.scratchExecutablePath, "/Applications/Scratch.app/Contents/MacOS/Scratch");
  assert.equal(nextState.statusText, "请从伴随程序打开已选 Scratch");
  assert.equal(nextState.detail.includes("已配置 Scratch 软件"), true);
});

test("SessionManager keeps unsupported status on Linux", async () => {
  const stateStore = new StateStore();
  const manager = new SessionManager(stateStore, {
    bridgeServer: createBridgeServerMock(),
    platform: "linux",
    log: () => {},
    configStore: createConfigStoreMock(),
    loadAiConfig: createAiConfigMock(),
    scratchLauncher: {},
    scratchRemoteDebugger: {}
  });

  await manager.start();

  const nextState = stateStore.getState();
  assert.equal(nextState.status, "unsupported");
  assert.equal(nextState.statusText, "当前版本暂不支持 Linux");
  assert.equal(nextState.detail, "当前版本已支持 Windows 和 macOS，请在受支持的平台运行这个伴随程序。");
});

test("SessionManager enters waiting state with the configured Scratch path", async () => {
  const stateStore = new StateStore();
  const manager = new SessionManager(stateStore, {
    bridgeServer: createBridgeServerMock(),
    platform: "win32",
    log: () => {},
    configStore: createConfigStoreMock("C:\\Scratch 3.exe"),
    loadAiConfig: createAiConfigMock(),
    scratchLauncher: {},
    scratchRemoteDebugger: {}
  });

  await manager.start();

  const nextState = stateStore.getState();
  assert.equal(nextState.status, "waiting");
  assert.equal(nextState.scratchExecutablePath, "C:\\Scratch 3.exe");
  assert.equal(nextState.aiStatus, "idle");
  assert.equal(nextState.aiModel, "deepseek-v4-flash");
  assert.equal(nextState.statusText, "请从伴随程序打开已选 Scratch");
  assert.equal(nextState.detail.includes("打开已选 Scratch"), true);
});

test("SessionManager derives current target programs from projectData", async () => {
  const stateStore = new StateStore();
  const bridgeServer = createBridgeServerMock();
  const manager = new SessionManager(stateStore, {
    bridgeServer,
    platform: "win32",
    log: () => {},
    configStore: createConfigStoreMock("C:\\Scratch 3.exe"),
    loadAiConfig: createAiConfigMock(),
    scratchLauncher: {},
    scratchRemoteDebugger: {}
  });

  await manager.start();

  manager.handlePayload({
    source: "test",
    currentTargetId: "sprite-a",
    currentTargetName: "Cat",
    toolboxCategories: ["motion", "looks"],
    loadedExtensions: ["music"],
    projectData: {
      targets: [
        {
          id: "sprite-a",
          name: "Cat",
          isStage: false,
          blocks: {
            a: {
              opcode: "event_whenflagclicked",
              next: "b",
              parent: null,
              inputs: {},
              fields: {},
              shadow: false,
              topLevel: true
            },
            b: {
              opcode: "motion_movesteps",
              next: "c",
              parent: "a",
              inputs: {},
              fields: {},
              shadow: false,
              topLevel: false
            },
            c: {
              opcode: "motion_turnright",
              next: "d",
              parent: "b",
              inputs: {},
              fields: {},
              shadow: false,
              topLevel: false
            },
            d: {
              opcode: "pen_clear",
              next: null,
              parent: "c",
              inputs: {},
              fields: {},
              shadow: false,
              topLevel: false
            }
          }
        }
      ]
    }
  });

  const nextState = stateStore.getState();
  assert.equal(nextState.status, "connected");
  assert.equal(nextState.currentTargetName, "Cat");
  assert.deepEqual(nextState.loadedExtensions, ["music"]);
  assert.deepEqual(
    nextState.programAreaModules.map((module) => ({
      id: module.id,
      blockCount: module.blockCount
    })),
    [
      { id: "motion", blockCount: 2 },
      { id: "pen", blockCount: 1 },
      { id: "event", blockCount: 1 }
    ]
  );
  assert.deepEqual(nextState.currentTargetPrograms, [
    "当绿旗被点击 -> 移动 10 步 -> 右转 15 度 -> 清空"
  ]);
});

test("SessionManager returns fallback AI hints when DeepSeek key is not configured", async () => {
  const stateStore = new StateStore();
  const manager = new SessionManager(stateStore, {
    bridgeServer: createBridgeServerMock(),
    platform: "win32",
    log: () => {},
    configStore: createConfigStoreMock("C:\\Scratch 3.exe"),
    loadAiConfig: createAiConfigMock(),
    scratchLauncher: {},
    scratchRemoteDebugger: {}
  });

  await manager.start();

  manager.handlePayload({
    source: "test",
    currentTargetId: "sprite-a",
    currentTargetName: "Cat",
    toolboxCategories: ["motion", "control"],
    projectData: {
      targets: [
        {
          id: "sprite-a",
          name: "Cat",
          isStage: false,
          blocks: {
            a: {
              opcode: "event_whenflagclicked",
              next: "b",
              parent: null,
              inputs: {},
              fields: {},
              shadow: false,
              topLevel: true
            },
            b: {
              opcode: "motion_movesteps",
              next: null,
              parent: "a",
              inputs: {},
              fields: {},
              shadow: false,
              topLevel: false
            }
          }
        }
      ]
    }
  });

  await manager.requestAiHint("让小猫一直走");

  const nextState = stateStore.getState();
  assert.equal(nextState.aiStatus, "ready");
  assert.equal(nextState.aiProvider, "fallback");
  assert.equal(nextState.aiModel, "local-heuristic");
  assert.equal(typeof nextState.aiCoachResponse?.answerText, "string");
  assert.equal(nextState.aiCoachResponse?.recommendedBlocks.length > 0, true);
});

test("SessionManager can generate hints from a project URL without a live Scratch connection", async () => {
  const stateStore = new StateStore();
  const importedProject = createImportedProjectResult(
    "https://raw.githubusercontent.com/tesths/scratchai/refs/heads/main/tools/verification/fixtures/projects/cat-and-a-mouse/source/Cat%20and%20a%20Mouse.sb3"
  );

  const manager = new SessionManager(stateStore, {
    bridgeServer: createBridgeServerMock(),
    platform: "win32",
    log: () => {},
    configStore: createConfigStoreMock("C:\\Scratch 3.exe"),
    loadAiConfig: createAiConfigMock(),
    projectUrlLoader: {
      load: async () => importedProject
    },
    scratchLauncher: {},
    scratchRemoteDebugger: {}
  });

  await manager.start();
  await manager.requestAiHintFromProjectUrl(
    "https://raw.githubusercontent.com/tesths/scratchai/refs/heads/main/tools/verification/fixtures/projects/cat-and-a-mouse/source/Cat%20and%20a%20Mouse.sb3",
    "让奶酪被碰到以后加分"
  );

  const nextState = stateStore.getState();
  assert.equal(nextState.status, "waiting");
  assert.equal(nextState.currentTargetName, "cheese");
  assert.deepEqual(nextState.currentTargetPrograms, [
    "当绿旗被点击 -> 一直重复 -> 碰到对象？ -> 将变量增加"
  ]);
  assert.equal(nextState.statusText, "已读取教师参考作品，可直接查看提示");
  assert.equal(nextState.detail, `来源：${importedProject.sourceLabel}`);
  assert.equal(nextState.aiStatus, "ready");
  assert.equal(nextState.aiProvider, "fallback");
  assert.equal(nextState.aiModel, "local-heuristic");
  assert.equal(typeof nextState.aiCoachResponse?.answerText, "string");
});

test("SessionManager keeps imported project as a teaching reference after a blank Scratch project connects", async () => {
  const stateStore = new StateStore();
  const importedProject = createImportedProjectResult("https://example.com/reference.sb3");
  const capturedOptions = [];

  const manager = new SessionManager(stateStore, {
    bridgeServer: createBridgeServerMock(),
    platform: "win32",
    log: () => {},
    configStore: createConfigStoreMock("C:\\Scratch 3.exe"),
    loadAiConfig: createAiConfigMock({
      configured: true,
      apiKey: "sk-test-demo",
      source: "custom",
      customKeyConfigured: true
    }),
    coachService: {
      generateHint: async (options) => {
        capturedOptions.push(options);
        return {
          source: "deepseek",
          model: "deepseek-v4-flash",
          coachResponse: {
            answerText: "先补一个最小起步脚本。",
            recommendedBlocks: [],
            nextStep: "先补一个最小起步脚本。",
            detectedIssues: [],
            followUpQuestion: "你想先做哪一步？"
          }
        };
      }
    },
    projectUrlLoader: {
      load: async () => importedProject
    },
    scratchLauncher: {},
    scratchRemoteDebugger: {}
  });

  await manager.start();
  await manager.requestAiHintFromProjectUrl("https://example.com/reference.sb3", "让学生从新项目一步一步完成");

  manager.handlePayload({
    source: "bootstrap",
    currentTargetId: "sprite-new",
    currentTargetName: "角色1",
    currentTargetIsStage: false,
    toolboxCategories: ["motion", "looks", "control"],
    projectData: {
      targets: [
        {
          id: "stage",
          name: "Stage",
          isStage: true,
          blocks: {}
        },
        {
          id: "sprite-new",
          name: "角色1",
          isStage: false,
          blocks: {}
        }
      ]
    }
  });

  await manager.requestAiHint();

  const lastOptions = capturedOptions.at(-1);
  assert.equal(lastOptions.snapshot.currentTarget, "角色1");
  assert.deepEqual(lastOptions.currentTargetPrograms, []);
  assert.equal(lastOptions.referenceSnapshot.currentTarget, "cheese");
  assert.equal(lastOptions.referenceSourceLabel, "https://example.com/reference.sb3");

  const nextState = stateStore.getState();
  assert.equal(nextState.aiProvider, "deepseek");
  assert.equal(nextState.detail.includes("新项目"), true);
  assert.equal(nextState.detail.includes("教师参考作品"), true);
});

test("SessionManager can switch to a saved custom AI key", async () => {
  const stateStore = new StateStore();
  let savedCustomKey = "";
  const manager = new SessionManager(stateStore, {
    bridgeServer: createBridgeServerMock(),
    platform: "win32",
    log: () => {},
    configStore: {
      load: async () => ({ scratchExecutablePath: "C:\\Scratch 3.exe" }),
      saveScratchExecutablePath: async (value) => ({ scratchExecutablePath: value, customAiApiKey: savedCustomKey || undefined }),
      saveCustomAiApiKey: async (value) => {
        savedCustomKey = value;
        return { scratchExecutablePath: "C:\\Scratch 3.exe", customAiApiKey: value };
      },
      clearCustomAiApiKey: async () => {
        savedCustomKey = "";
        return { scratchExecutablePath: "C:\\Scratch 3.exe" };
      },
      saveCustomAiPrompt: async (value) => ({ scratchExecutablePath: "C:\\Scratch 3.exe", customAiPrompt: value }),
      clearCustomAiPrompt: async () => ({ scratchExecutablePath: "C:\\Scratch 3.exe" })
    },
    loadAiConfig: async (_configPath, options) => ({
      configured: Boolean(options?.customApiKey),
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-v4-flash",
      timeoutMs: 20000,
      configPath: "C:\\config\\deepseek.config.json",
      customKeyConfigured: Boolean(options?.customApiKey),
      source: options?.customApiKey ? "custom" : undefined,
      ...(options?.customApiKey ? { apiKey: options.customApiKey } : {})
    }),
    scratchLauncher: {},
    scratchRemoteDebugger: {}
  });

  await manager.start();
  await manager.saveCustomAiApiKey("sk-custom-demo");

  const nextState = stateStore.getState();
  assert.equal(nextState.aiConfigured, true);
  assert.equal(nextState.aiCustomKeyConfigured, true);
  assert.equal(nextState.aiConfigSource, "custom");

  await manager.clearCustomAiApiKey();
  const clearedState = stateStore.getState();
  assert.equal(clearedState.aiConfigured, false);
  assert.equal(clearedState.aiCustomKeyConfigured, false);
});

test("SessionManager saves a custom teacher prompt and reuses it for hint generation", async () => {
  const stateStore = new StateStore();
  const capturedOptions = [];

  const manager = new SessionManager(stateStore, {
    bridgeServer: createBridgeServerMock(),
    platform: "win32",
    log: () => {},
    configStore: createConfigStoreMock("C:\\Scratch 3.exe"),
    loadAiConfig: createAiConfigMock({
      configured: true,
      apiKey: "sk-test-demo",
      source: "custom",
      customKeyConfigured: true
    }),
    coachService: {
      generateHint: async (options) => {
        capturedOptions.push(options);
        return {
          source: "deepseek",
          model: "deepseek-v4-flash",
          coachResponse: {
            answerText: "先做碰撞判断。",
            recommendedBlocks: [],
            nextStep: "先做碰撞判断。",
            detectedIssues: [],
            followUpQuestion: "想先在哪个角色里补？"
          }
        };
      }
    },
    scratchLauncher: {},
    scratchRemoteDebugger: {}
  });

  await manager.start();
  assert.equal(stateStore.getState().aiDefaultPrompt?.includes("你是 Scratch 小学编程助教"), true);
  assert.equal(stateStore.getState().aiCustomPrompt, undefined);
  await manager.saveCustomAiPrompt("请优先提醒碰撞和加分。");

  manager.handlePayload({
    source: "test",
    currentTargetId: "sprite-a",
    currentTargetName: "Cat",
    toolboxCategories: ["motion", "control"],
    projectData: {
      targets: [
        {
          id: "sprite-a",
          name: "Cat",
          isStage: false,
          blocks: {
            a: {
              opcode: "event_whenflagclicked",
              next: "b",
              parent: null,
              inputs: {},
              fields: {},
              shadow: false,
              topLevel: true
            },
            b: {
              opcode: "motion_movesteps",
              next: null,
              parent: "a",
              inputs: {},
              fields: {},
              shadow: false,
              topLevel: false
            }
          }
        }
      ]
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 0));

  const lastOptions = capturedOptions.at(-1);
  assert.equal(lastOptions.customSystemPrompt, "请优先提醒碰撞和加分。");
  assert.equal(stateStore.getState().aiCustomPromptConfigured, true);
  assert.equal(stateStore.getState().aiCustomPrompt, "请优先提醒碰撞和加分。");

  await manager.clearCustomAiPrompt();
  assert.equal(stateStore.getState().aiCustomPromptConfigured, false);
  assert.equal(stateStore.getState().aiCustomPrompt, undefined);
  assert.equal(stateStore.getState().aiDefaultPrompt?.includes("你是 Scratch 小学编程助教"), true);
});
