import {rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import packager from '@electron/packager';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const outputDir = path.join(appDir, 'release');
const iconPath = path.join(appDir, 'buildResources', 'ScratchDesktop.ico');

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
        /\/release($|\/)/,
        /\/release-single($|\/)/,
        /\/release-installer($|\/)/,
        /\/test($|\/)/
    ]
});

process.stdout.write(`Packaged directory build written to ${outputDir}\n`);
