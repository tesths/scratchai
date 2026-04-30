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

test("SessionManager enters waiting state when Scratch path is not configured", async () => {
  const stateStore = new StateStore();
  const manager = new SessionManager(stateStore, {
    bridgeServer: createBridgeServerMock(),
    platform: "win32",
    log: () => {},
    configStore: {
      load: async () => ({}),
      saveScratchExecutablePath: async (value) => ({ scratchExecutablePath: value }),
      saveCustomAiApiKey: async (value) => ({ customAiApiKey: value }),
      clearCustomAiApiKey: async () => ({})
    },
    loadAiConfig: createAiConfigMock(),
    scratchLauncher: {},
    scratchRemoteDebugger: {}
  });

  await manager.start();

  assert.deepEqual(stateStore.getState(), {
    status: "waiting",
    statusText: "请先选择 Scratch 路径",
    launchMode: "controlled-launch",
    injectionMode: "cdp-runtime-evaluate",
    toolboxCategories: [],
    usedExtensions: [],
    loadedExtensions: [],
    programAreaModules: [],
    currentTargetPrograms: [],
    aiConfigured: false,
    aiConfigPath: "C:\\config\\deepseek.config.json",
    aiCustomKeyConfigured: false,
    aiStatus: "idle",
    aiModel: "deepseek-v4-flash",
    detail:
      "本地监听端已启动：http://127.0.0.1:39000。请先选择老师机上的 Scratch 可执行文件（Scratch.exe 或 Scratch 3.exe）。"
  });
});

test("SessionManager enters waiting state with the configured Scratch path", async () => {
  const stateStore = new StateStore();
  const manager = new SessionManager(stateStore, {
    bridgeServer: createBridgeServerMock(),
    platform: "win32",
    log: () => {},
    configStore: {
      load: async () => ({ scratchExecutablePath: "C:\\Scratch 3.exe" }),
      saveScratchExecutablePath: async (value) => ({ scratchExecutablePath: value }),
      saveCustomAiApiKey: async (value) => ({ scratchExecutablePath: "C:\\Scratch 3.exe", customAiApiKey: value }),
      clearCustomAiApiKey: async () => ({ scratchExecutablePath: "C:\\Scratch 3.exe" })
    },
    loadAiConfig: createAiConfigMock(),
    scratchLauncher: {},
    scratchRemoteDebugger: {}
  });

  await manager.start();

  assert.deepEqual(stateStore.getState(), {
    status: "waiting",
    statusText: "请从伴随程序启动 Scratch Desktop",
    launchMode: "controlled-launch",
    injectionMode: "cdp-runtime-evaluate",
    scratchExecutablePath: "C:\\Scratch 3.exe",
    toolboxCategories: [],
    usedExtensions: [],
    loadedExtensions: [],
    programAreaModules: [],
    currentTargetPrograms: [],
    aiConfigured: false,
    aiConfigPath: "C:\\config\\deepseek.config.json",
    aiCustomKeyConfigured: false,
    aiStatus: "idle",
    aiModel: "deepseek-v4-flash",
    detail:
      "已配置 Scratch 程序：C:\\Scratch 3.exe。点击“打开 Scratch”后，伴随程序会自动连接调试端口。"
  });
});

test("SessionManager derives current target programs from projectData", async () => {
  const stateStore = new StateStore();
  const bridgeServer = createBridgeServerMock();
  const manager = new SessionManager(stateStore, {
    bridgeServer,
    platform: "win32",
    log: () => {},
    configStore: {
      load: async () => ({ scratchExecutablePath: "C:\\Scratch 3.exe" }),
      saveScratchExecutablePath: async (value) => ({ scratchExecutablePath: value }),
      saveCustomAiApiKey: async (value) => ({ scratchExecutablePath: "C:\\Scratch 3.exe", customAiApiKey: value }),
      clearCustomAiApiKey: async () => ({ scratchExecutablePath: "C:\\Scratch 3.exe" })
    },
    loadAiConfig: createAiConfigMock(),
    scratchLauncher: {},
    scratchRemoteDebugger: {}
  });

  await manager.start();

  manager.handlePayload({
    source: "test",
    currentTargetId: "sprite-a",
    currentTargetName: "Cat",
    toolboxCategories: ["运动", "外观"],
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
  assert.deepEqual(nextState.programAreaModules, [
    { id: "motion", label: "运动", blockCount: 2 },
    { id: "pen", label: "画笔", blockCount: 1 },
    { id: "event", label: "事件", blockCount: 1 }
  ]);
  assert.deepEqual(nextState.currentTargetPrograms, [
    "event_whenflagclicked -> motion_movesteps -> motion_turnright -> pen_clear"
  ]);
});

test("SessionManager returns fallback AI hints when DeepSeek key is not configured", async () => {
  const stateStore = new StateStore();
  const manager = new SessionManager(stateStore, {
    bridgeServer: createBridgeServerMock(),
    platform: "win32",
    log: () => {},
    configStore: {
      load: async () => ({ scratchExecutablePath: "C:\\Scratch 3.exe" }),
      saveScratchExecutablePath: async (value) => ({ scratchExecutablePath: value }),
      saveCustomAiApiKey: async (value) => ({ scratchExecutablePath: "C:\\Scratch 3.exe", customAiApiKey: value }),
      clearCustomAiApiKey: async () => ({ scratchExecutablePath: "C:\\Scratch 3.exe" })
    },
    loadAiConfig: createAiConfigMock(),
    scratchLauncher: {},
    scratchRemoteDebugger: {}
  });

  await manager.start();

  manager.handlePayload({
    source: "test",
    currentTargetId: "sprite-a",
    currentTargetName: "Cat",
    toolboxCategories: ["运动", "控制"],
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
      }
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
