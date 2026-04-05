import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import sharp from 'sharp';
import type { ChatData } from './types.js';

export interface BuildOptions {
  chatData: ChatData;
  inputFolder: string;
  assetFiles: string[];
  outputDir: string;
  appName: string;
  iconPath?: string;
}

const LOCKFILE = 'kakao-packager.lock';
const BUILD_ICONS_DIR = '.build-icons';
// macOS iconset requires specific filenames
const ICONSET_ENTRIES: [number, string][] = [
  [16, 'icon_16x16.png'], [32, 'icon_16x16@2x.png'],
  [32, 'icon_32x32.png'], [64, 'icon_32x32@2x.png'],
  [128, 'icon_128x128.png'], [256, 'icon_128x128@2x.png'],
  [256, 'icon_256x256.png'], [512, 'icon_256x256@2x.png'],
  [512, 'icon_512x512.png'], [1024, 'icon_512x512@2x.png'],
];

function acquireLock(projectRoot: string): void {
  const lockPath = path.join(projectRoot, LOCKFILE);
  if (fs.existsSync(lockPath)) {
    const pid = fs.readFileSync(lockPath, 'utf-8').trim();
    try {
      process.kill(parseInt(pid), 0);
      throw new Error(`다른 빌드가 진행 중입니다 (PID: ${pid}). 완료 후 다시 시도하세요.`);
    } catch (e: any) {
      if (e.code !== 'ESRCH') throw e;
    }
  }
  fs.writeFileSync(lockPath, process.pid.toString(), 'utf-8');
}

function releaseLock(projectRoot: string): void {
  fs.rmSync(path.join(projectRoot, LOCKFILE), { force: true });
}

/**
 * Process an icon image into .icns via sharp (image processing) + iconutil (macOS built-in).
 * Crop-to-fill: scales to cover, then center-crops.
 * Accepts any format sharp supports (PNG, JPEG, HEIC, WebP, etc.)
 * Returns path to generated .icns file.
 */
async function generateIcns(inputPath: string, outputDir: string): Promise<string> {
  const iconsetDir = path.join(outputDir, 'app.iconset');
  fs.mkdirSync(iconsetDir, { recursive: true });

  // Crop-to-fill 1024x1024, force RGBA
  const base = await sharp(inputPath)
    .resize(1024, 1024, { fit: 'cover', position: 'centre' })
    .ensureAlpha()
    .png()
    .toBuffer();

  for (const [size, name] of ICONSET_ENTRIES) {
    await sharp(base).resize(size, size).png().toFile(path.join(iconsetDir, name));
  }

  const icnsPath = path.join(outputDir, 'icon.icns');
  execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`, { stdio: 'pipe' });
  fs.rmSync(iconsetDir, { recursive: true, force: true });
  return icnsPath;
}

export async function buildViewer(options: BuildOptions): Promise<string> {
  const { chatData, inputFolder, assetFiles, outputDir, appName, iconPath } = options;
  const chatName = chatData.metadata.chatName;

  const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
  const viewerDir = path.join(projectRoot, 'src/viewer');
  const tauriDir = path.join(projectRoot, 'src-tauri');
  const viteDist = path.join(viewerDir, 'dist');
  const buildIconsDir = path.join(tauriDir, BUILD_ICONS_DIR);

  acquireLock(projectRoot);

  try {
    // 1. Build viewer with Vite
    console.log('🔨 뷰어 빌드 중...');
    execSync('npx vite build', { cwd: viewerDir, stdio: 'pipe' });
    console.log('  ✓ Vite 빌드 완료');

    // 2. Inject data into dist/
    console.log('📦 에셋 주입 중...');
    const distAssetsDir = path.join(viteDist, 'assets');
    fs.mkdirSync(distAssetsDir, { recursive: true });
    for (const file of assetFiles) {
      fs.copyFileSync(path.join(inputFolder, file), path.join(distAssetsDir, file));
    }
    fs.writeFileSync(path.join(viteDist, 'chat-data.json'), JSON.stringify(chatData), 'utf-8');
    console.log(`  ✓ ${assetFiles.length}개 에셋 + 채팅 데이터 주입 완료`);

    // 3. Generate .icns into temp dir (source icons untouched)
    const iconSource = iconPath ?? path.join(tauriDir, 'icons/icon.png');
    console.log('🎨 아이콘 생성 중...');
    const icnsPath = await generateIcns(iconSource, buildIconsDir);
    console.log('  ✓ .icns 아이콘 생성 완료');

    // 4. Build with Tauri
    console.log('🍎 .app 빌드 중 (Tauri)...');
    const configOverride = JSON.stringify({
      productName: 'KakaoChat',
      app: { windows: [{ title: '' }] },
      bundle: {
        icon: [path.relative(tauriDir, icnsPath)],
      },
    });

    try {
      execSync(`npx tauri build --target aarch64-apple-darwin --bundles app --config '${configOverride}'`, {
        cwd: projectRoot,
        stdio: 'inherit',
      });
    } catch (buildErr: any) {
      throw new Error(`Tauri 빌드 실패\n${buildErr.stderr?.toString() || buildErr.message}`);
    }

    // 5. Copy .app to output
    const bundleMacosDir = path.join(tauriDir, 'target/aarch64-apple-darwin/release/bundle/macos');
    const appFiles = fs.existsSync(bundleMacosDir)
      ? fs.readdirSync(bundleMacosDir).filter(f => f.endsWith('.app'))
      : [];

    if (appFiles.length > 0) {
      const finalPath = path.join(outputDir, `${appName}.app`);
      fs.rmSync(finalPath, { recursive: true, force: true });
      execSync(`cp -R "${path.join(bundleMacosDir, appFiles[0])}" "${finalPath}"`, { stdio: 'pipe' });
      console.log(`  ✓ .app 빌드 완료: ${finalPath}`);
      return finalPath;
    }

    throw new Error('빌드된 .app을 찾을 수 없습니다.');
  } catch (e: any) {
    if (fs.existsSync(viteDist)) {
      console.error(`  ⚠ Tauri 빌드 실패: ${e.message ?? e}`);
      console.log('  웹 폴더로 출력합니다.');
      const fallbackDir = path.join(outputDir, chatName);
      fs.rmSync(fallbackDir, { recursive: true, force: true });
      fs.renameSync(viteDist, fallbackDir);
      console.log(`  ✓ 웹 폴더 출력 완료: ${fallbackDir}/index.html`);
      return fallbackDir;
    }
    throw e;
  } finally {
    // Always clean up — worktree stays clean
    fs.rmSync(buildIconsDir, { recursive: true, force: true });
    fs.rmSync(viteDist, { recursive: true, force: true });
    releaseLock(projectRoot);
  }
}
