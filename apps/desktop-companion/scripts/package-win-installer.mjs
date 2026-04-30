import {copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {build} from 'electron-builder';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const outputDir = path.join(appDir, 'release-installer');
const iconPath = path.join(appDir, 'buildResources', 'ScratchDesktop.ico');
const installerFileName = 'ScratchDesktopCompanion-setup.exe';
const rootInstallerPath = path.resolve(appDir, '..', '..', installerFileName);

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
                    target: 'nsis',
                    arch: ['x64']
                }
            ]
        },
        nsis: {
            oneClick: false,
            perMachine: false,
            allowToChangeInstallationDirectory: true,
            installerIcon: iconPath,
            uninstallerIcon: iconPath,
            installerHeaderIcon: iconPath
        },
        artifactName: 'ScratchDesktopCompanion-setup.${ext}'
    }
});

await copyFile(path.join(outputDir, installerFileName), rootInstallerPath);

process.stdout.write(`Installer build written to ${outputDir}\n`);
process.stdout.write(`Root installer copied to ${rootInstallerPath}\n`);
