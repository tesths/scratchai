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

  return {
    load: async () => ({
      ...(scratchExecutablePath ? { scratchExecutablePath } : {}),
      ...(customAiApiKey ? { customAiApiKey } : {})
    }),
    saveScratchExecutablePath: async (value) => {
      scratchExecutablePath = value;
      return {
        ...(scratchExecutablePath ? { scratchExecutablePath } : {}),
        ...(customAiApiKey ? { customAiApiKey } : {})
      };
    },
    saveCustomAiApiKey: async (value) => {
      customAiApiKey = value;
      return {
        ...(scratchExecutablePath ? { scratchExecutablePath } : {}),
        ...(customAiApiKey ? { customAiApiKey } : {})
      };
    },
    clearCustomAiApiKey: async () => {
      customAiApiKey = undefined;
      return {
        ...(scratchExecutablePath ? { scratchExecutablePath } : {})
      };
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
    "event_whenflagclicked -> motion_movesteps -> motion_turnright -> pen_clear"
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
  const sharedModules = [
    { id: "event", label: "event", blockCount: 1 },
    { id: "control", label: "control", blockCount: 1 },
    { id: "sensing", label: "sensing", blockCount: 1 },
    { id: "data", label: "data", blockCount: 1 }
  ];

  const manager = new SessionManager(stateStore, {
    bridgeServer: createBridgeServerMock(),
    platform: "win32",
    log: () => {},
    configStore: createConfigStoreMock("C:\\Scratch 3.exe"),
    loadAiConfig: createAiConfigMock(),
    projectUrlLoader: {
      load: async (projectUrl) => ({
        sourceLabel: projectUrl,
        currentTargetName: "cheese",
        currentTargetIsStage: false,
        currentTargetPrograms: [
          "event_whenflagclicked -> control_forever -> sensing_touchingobject -> data_changevariableby"
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
                  event: "when green flag clicked",
                  blockSequence: [
                    "event_whenflagclicked",
                    "control_forever",
                    "sensing_touchingobject",
                    "data_changevariableby"
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
      })
    },
    scratchLauncher: {},
    scratchRemoteDebugger: {}
  });

  await manager.start();
  await manager.requestAiHintFromProjectUrl(
    "https://raw.githubusercontent.com/tesths/scratchai/refs/heads/main/Windows-Test/fixtures/projects/cat-and-a-mouse/source/Cat%20and%20a%20Mouse.sb3",
    "让奶酪被碰到以后加分"
  );

  const nextState = stateStore.getState();
  assert.equal(nextState.status, "waiting");
  assert.equal(nextState.currentTargetName, "cheese");
  assert.deepEqual(nextState.currentTargetPrograms, [
    "event_whenflagclicked -> control_forever -> sensing_touchingobject -> data_changevariableby"
  ]);
  assert.equal(nextState.aiStatus, "ready");
  assert.equal(nextState.aiProvider, "fallback");
  assert.equal(nextState.aiModel, "local-heuristic");
  assert.equal(typeof nextState.aiCoachResponse?.answerText, "string");
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
