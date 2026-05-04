import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_PACKAGED_DEEPSEEK_API_KEY,
  PACKAGED_API_KEY_ENV_NAME,
  PACKAGED_KEY_MODE_ENV_NAME,
  parsePackageVariantArg,
  resolvePackagedDeepSeekConfig
} from '../scripts/package-variant.mjs';

test('parsePackageVariantArg defaults to source', () => {
  assert.equal(parsePackageVariantArg(['node', 'script.mjs']), 'source');
});

test('resolvePackagedDeepSeekConfig forces placeholder key for no-key builds', () => {
  const resolved = resolvePackagedDeepSeekConfig(
    {
      apiKey: 'sk-source-demo',
      model: 'deepseek-v4-flash'
    },
    {
      [PACKAGED_KEY_MODE_ENV_NAME]: 'no-key'
    }
  );

  assert.equal(resolved.mode, 'no-key');
  assert.equal(resolved.configured, false);
  assert.equal(resolved.config.apiKey, DEFAULT_PACKAGED_DEEPSEEK_API_KEY);
  assert.equal(resolved.config.model, 'deepseek-v4-flash');
});

test('resolvePackagedDeepSeekConfig prefers packaged env key for with-key builds', () => {
  const resolved = resolvePackagedDeepSeekConfig(
    {
      apiKey: 'sk-source-demo',
      model: 'deepseek-v4-pro'
    },
    {
      [PACKAGED_KEY_MODE_ENV_NAME]: 'with-key',
      [PACKAGED_API_KEY_ENV_NAME]: '  sk-env-demo  '
    }
  );

  assert.equal(resolved.mode, 'with-key');
  assert.equal(resolved.configured, true);
  assert.equal(resolved.config.apiKey, 'sk-env-demo');
  assert.equal(resolved.config.model, 'deepseek-v4-pro');
});

test('resolvePackagedDeepSeekConfig rejects with-key builds without a usable key', () => {
  assert.throws(
    () =>
      resolvePackagedDeepSeekConfig(
        {
          apiKey: DEFAULT_PACKAGED_DEEPSEEK_API_KEY
        },
        {
          [PACKAGED_KEY_MODE_ENV_NAME]: 'with-key'
        }
      ),
    /Packaged DeepSeek key is required/
  );
});
