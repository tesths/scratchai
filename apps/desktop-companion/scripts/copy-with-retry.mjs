import path from 'node:path';
import { copyFile, cp, lstat, mkdir, rm } from 'node:fs/promises';

const RETRYABLE_COPY_ERROR_CODES = new Set(['EBUSY', 'EPERM', 'EACCES']);

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function copyFileWithRetry(sourcePath, targetPath, options = {}) {
  const attempts = options.attempts ?? 10;
  const delayMs = options.delayMs ?? 1500;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await copyFile(sourcePath, targetPath);
      return;
    } catch (error) {
      const errorCode = error && typeof error === 'object' ? error.code : undefined;
      const canRetry = RETRYABLE_COPY_ERROR_CODES.has(String(errorCode));
      if (!canRetry || attempt >= attempts) {
        throw error;
      }

      await delay(delayMs * attempt);
    }
  }
}

export async function copyPathWithRetry(sourcePath, targetPath, options = {}) {
  const attempts = options.attempts ?? 10;
  const delayMs = options.delayMs ?? 1500;
  const sourceStats = await lstat(sourcePath);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await mkdir(path.dirname(targetPath), { recursive: true });

      if (sourceStats.isDirectory()) {
        await rm(targetPath, { recursive: true, force: true });
        await cp(sourcePath, targetPath, {
          recursive: true,
          force: true,
          preserveTimestamps: true,
          verbatimSymlinks: true
        });
      } else {
        await copyFile(sourcePath, targetPath);
      }
      return;
    } catch (error) {
      const errorCode = error && typeof error === 'object' ? error.code : undefined;
      const canRetry = RETRYABLE_COPY_ERROR_CODES.has(String(errorCode));
      if (!canRetry || attempt >= attempts) {
        throw error;
      }

      await delay(delayMs * attempt);
    }
  }
}
