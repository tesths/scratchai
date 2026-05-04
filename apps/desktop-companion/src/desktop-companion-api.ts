export interface DesktopCompanionApi {
  getInitialState: () => Promise<unknown>;
  onStateChange: (listener: (state: unknown) => void) => () => void;
  retryNow: () => Promise<void>;
  chooseScratchExecutable: () => Promise<string | null>;
  launchScratch: () => Promise<void>;
  openSettings: () => Promise<void>;
  requestAiHint: (goal?: string) => Promise<void>;
  requestAiHintFromProjectUrl: (projectUrl: string, goal?: string) => Promise<void>;
  saveCustomAiApiKey: (apiKey: string) => Promise<void>;
  clearCustomAiApiKey: () => Promise<void>;
  saveCustomAiPrompt: (prompt: string) => Promise<void>;
  clearCustomAiPrompt: () => Promise<void>;
}
