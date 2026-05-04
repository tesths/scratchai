import { EventEmitter } from "node:events";

import type { DesktopCompanionState } from "./types";

export class StateStore {
  private readonly emitter = new EventEmitter();

  private state: DesktopCompanionState = {
    status: "starting",
    statusText: "桌面伴随程序正在启动…",
    toolboxCategories: [],
    usedExtensions: [],
    loadedExtensions: [],
    programAreaModules: [],
    currentTargetPrograms: [],
    aiConfigured: false,
    aiCustomKeyConfigured: false,
    aiCustomPromptConfigured: false,
    aiStatus: "idle"
  };

  getState() {
    return this.state;
  }

  setState(nextState: DesktopCompanionState) {
    this.state = nextState;
    this.emitter.emit("change", this.state);
  }

  update(patch: Partial<DesktopCompanionState>) {
    const nextState = { ...this.state } as Record<string, unknown>;
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) {
        delete nextState[key];
        continue;
      }
      nextState[key] = value;
    }

    nextState.toolboxCategories = patch.toolboxCategories ?? this.state.toolboxCategories;
    nextState.usedExtensions = patch.usedExtensions ?? this.state.usedExtensions;
    nextState.loadedExtensions = patch.loadedExtensions ?? this.state.loadedExtensions;
    nextState.programAreaModules = patch.programAreaModules ?? this.state.programAreaModules;
    nextState.currentTargetPrograms = patch.currentTargetPrograms ?? this.state.currentTargetPrograms;
    nextState.aiConfigured = patch.aiConfigured ?? this.state.aiConfigured;
    nextState.aiCustomKeyConfigured = patch.aiCustomKeyConfigured ?? this.state.aiCustomKeyConfigured;
    nextState.aiCustomPromptConfigured =
      patch.aiCustomPromptConfigured ?? this.state.aiCustomPromptConfigured;
    nextState.aiStatus = patch.aiStatus ?? this.state.aiStatus;

    this.setState(nextState as DesktopCompanionState);
  }

  onChange(listener: (state: DesktopCompanionState) => void) {
    this.emitter.on("change", listener);
    return () => {
      this.emitter.off("change", listener);
    };
  }
}
