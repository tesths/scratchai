import { execFileSync } from 'node:child_process';
import path from 'node:path';

export const DEFAULT_PACKAGED_DEEPSEEK_API_KEY = 'PLEASE_FILL_DEEPSEEK_API_KEY';
export const PACKAGED_KEY_MODE_ENV_NAME = 'SCRATCH_AI_PACKAGED_KEY_MODE';
export const PACKAGED_API_KEY_ENV_NAME = 'SCRATCH_AI_PACKAGED_DEEPSEEK_API_KEY';

const PLACEHOLDER_API_KEYS = new Set([
  '',
  DEFAULT_PACKAGED_DEEPSEEK_API_KEY,
  'YOUR_DEEPSEEK_API_KEY'
]);

const VALID_PACKAGE_VARIANTS = new Set(['source', 'with-key', 'no-key']);

function normalizeApiKey(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isConfiguredApiKey(value) {
  const candidate = normalizeApiKey(value);
  return Boolean(candidate) && !PLACEHOLDER_API_KEYS.has(candidate);
}

export function validatePackageVariant(variant) {
  if (!VALID_PACKAGE_VARIANTS.has(variant)) {
    throw new Error(`Unsupported package variant "${variant}". Expected one of: source, with-key, no-key.`);
  }

  return variant;
}

export function parsePackageVariantArg(argv, defaultVariant = 'source') {
  const rawArg = argv.find((arg) => arg.startsWith('--variant='));
  const variant = rawArg ? rawArg.slice('--variant='.length).trim() : defaultVariant;
  return validatePackageVariant(variant);
}

export function hasCliFlag(argv, flag) {
  return argv.includes(flag);
}

export function getPackageVariantMeta(variant) {
  if (variant === 'with-key') {
    return {
      variant,
      displayName: 'with packaged key',
      outputDirSuffix: '-with-key',
      artifactBaseName: 'ScratchDesktopCompanion-with-key',
      packagedKeyMode: 'with-key'
    };
  }

  if (variant === 'no-key') {
    return {
      variant,
      displayName: 'without packaged key',
      outputDirSuffix: '-no-key',
      artifactBaseName: 'ScratchDesktopCompanion-no-key',
      packagedKeyMode: 'no-key'
    };
  }

  return {
    variant: 'source',
    displayName: 'from source config',
    outputDirSuffix: '',
    artifactBaseName: 'ScratchDesktopCompanion',
    packagedKeyMode: 'source'
  };
}

export function resolvePackagedDeepSeekConfig(sourceConfig, env = process.env) {
  const packagedKeyMode = validatePackageVariant((env[PACKAGED_KEY_MODE_ENV_NAME] ?? 'source').trim() || 'source');

  const sourceApiKey = normalizeApiKey(sourceConfig?.apiKey);

  if (packagedKeyMode === 'no-key') {
    return {
      mode: packagedKeyMode,
      configured: false,
      config: {
        ...sourceConfig,
        apiKey: DEFAULT_PACKAGED_DEEPSEEK_API_KEY
      }
    };
  }

  if (packagedKeyMode === 'with-key') {
    const envApiKey = normalizeApiKey(env[PACKAGED_API_KEY_ENV_NAME]);
    const packagedApiKey = envApiKey || sourceApiKey;

    if (!isConfiguredApiKey(packagedApiKey)) {
      throw new Error(
        `Packaged DeepSeek key is required for variant "with-key". Set ${PACKAGED_API_KEY_ENV_NAME} or fill src/deepseek.config.json first.`
      );
    }

    return {
      mode: packagedKeyMode,
      configured: true,
      config: {
        ...sourceConfig,
        apiKey: packagedApiKey
      }
    };
  }

  return {
    mode: packagedKeyMode,
    configured: isConfiguredApiKey(sourceApiKey),
    config: {
      ...sourceConfig
    }
  };
}

export function runBuildForVariant(appDir, variant) {
  const variantMeta = getPackageVariantMeta(variant);

  execFileSync(process.execPath, [path.join(appDir, 'build.mjs')], {
    cwd: appDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      [PACKAGED_KEY_MODE_ENV_NAME]: variantMeta.packagedKeyMode
    }
  });
}
