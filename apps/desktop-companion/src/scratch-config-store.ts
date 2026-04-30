import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CONFIG_FILE_NAME = "desktop-companion.config.json";

export class ScratchExecutableConfigStore {
  private readonly filePath: string;

  constructor(baseDir: string) {
    this.filePath = path.join(baseDir, CONFIG_FILE_NAME);
  }

  async load() {
    const parsed = await this.readParsedConfig();
    const nextConfig: {
      scratchExecutablePath?: string;
      customAiApiKey?: string;
    } = {};

    if (typeof parsed.scratchExecutablePath === "string" && parsed.scratchExecutablePath.trim()) {
      nextConfig.scratchExecutablePath = parsed.scratchExecutablePath.trim();
    }

    if (typeof parsed.customAiApiKey === "string" && parsed.customAiApiKey.trim()) {
      nextConfig.customAiApiKey = parsed.customAiApiKey.trim();
    }

    return nextConfig;
  }

  async saveScratchExecutablePath(scratchExecutablePath: string) {
    const currentConfig = await this.load();
    const nextConfig = {
      ...currentConfig,
      scratchExecutablePath: scratchExecutablePath.trim()
    };

    await this.writeConfig(nextConfig);
    return nextConfig;
  }

  async saveCustomAiApiKey(customAiApiKey: string) {
    const currentConfig = await this.load();
    const nextConfig = {
      ...currentConfig,
      customAiApiKey: customAiApiKey.trim()
    };

    await this.writeConfig(nextConfig);
    return nextConfig;
  }

  async clearCustomAiApiKey() {
    const currentConfig = await this.load();
    const nextConfig = {
      ...currentConfig
    };

    delete nextConfig.customAiApiKey;

    await this.writeConfig(nextConfig);
    return nextConfig;
  }

  private async readParsedConfig() {
    try {
      const rawConfig = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(rawConfig);

      if (!parsed || typeof parsed !== "object") {
        return {} as Record<string, unknown>;
      }

      return parsed as Record<string, unknown>;
    } catch {
      return {} as Record<string, unknown>;
    }
  }

  private async writeConfig(nextConfig: Record<string, unknown>) {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(nextConfig, null, 2), "utf8");
  }
}
