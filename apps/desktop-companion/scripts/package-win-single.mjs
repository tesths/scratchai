import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {build} from 'electron-builder';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const outputDir = path.join(appDir, 'release-single');
const iconPath = path.join(appDir, 'buildResources', 'ScratchDesktop.ico');

await build({
    projectDir: appDir,
    targets: undefined,
    config: {
        appId: 'com.scratchai.desktopcompanion',
        productName: 'ScratchDesktopCompanion',
        compression: 'maximum',
        electronLanguages: ['zh-CN', 'en-US'],
        directories: {
            output: outputDir
        },
        files: [
            'dist/**/*',
            'node_modules/**/*',
            'package.json'
        ],
        extraMetadata: {
            main: 'dist/main.js'
        },
        asar: true,
        win: {
            icon: iconPath,
            target: [
                {
                    target: 'portable',
                    arch: ['x64']
                }
            ]
        },
        artifactName: 'ScratchDesktopCompanion-portable.${ext}'
    }
});

process.stdout.write(`Portable build written to ${outputDir}\n`);
