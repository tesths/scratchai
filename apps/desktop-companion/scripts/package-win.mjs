import {rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import packager from '@electron/packager';
import {getPackageVariantMeta, hasCliFlag, parsePackageVariantArg, runBuildForVariant} from './package-variant.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const iconPath = path.join(appDir, 'buildResources', 'ScratchDesktop.ico');
const variant = parsePackageVariantArg(process.argv);
const variantMeta = getPackageVariantMeta(variant);
const outputDir = path.join(appDir, `release${variantMeta.outputDirSuffix}`);

if (!hasCliFlag(process.argv, '--skip-build')) {
    runBuildForVariant(appDir, variant);
}

await rm(outputDir, {recursive: true, force: true});

await packager({
    dir: appDir,
    out: outputDir,
    platform: 'win32',
    arch: 'x64',
    overwrite: true,
    asar: true,
    prune: false,
    icon: iconPath,
    executableName: 'ScratchDesktopCompanion',
    name: 'ScratchDesktopCompanion',
    ignore: [
        /\/release(?:-(?:single|installer))?(?:-(?:with-key|no-key))?($|\/)/,
        /\/test($|\/)/
    ]
});

process.stdout.write(`Packaged directory build (${variantMeta.displayName}) written to ${outputDir}\n`);
