import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
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

function acquireLock(projectRoot: string): void {
  const lockPath = path.join(projectRoot, LOCKFILE);
  if (fs.existsSync(lockPath)) {
    const pid = fs.readFileSync(lockPath, 'utf-8').trim();
    // Check if process is still running
    try {
      process.kill(parseInt(pid), 0);
      throw new Error(`다른 빌드가 진행 중입니다 (PID: ${pid}). 완료 후 다시 시도하세요.`);
    } catch (e: any) {
      if (e.code !== 'ESRCH') throw e;
      // Process doesn't exist — stale lock, remove it
    }
  }
  fs.writeFileSync(lockPath, process.pid.toString(), 'utf-8');
}

function releaseLock(projectRoot: string): void {
  const lockPath = path.join(projectRoot, LOCKFILE);
  fs.rmSync(lockPath, { force: true });
}

function generateIcns(pngPath: string, icnsPath: string): void {
  const iconsetDir = path.join(path.dirname(pngPath), '.tmp-iconset');
  fs.mkdirSync(iconsetDir, { recursive: true });
  const sizes = [16, 32, 64, 128, 256, 512, 1024];
  const names: [number, string][] = [
    [16, 'icon_16x16.png'], [32, 'icon_16x16@2x.png'],
    [32, 'icon_32x32.png'], [64, 'icon_32x32@2x.png'],
    [128, 'icon_128x128.png'], [256, 'icon_128x128@2x.png'],
    [256, 'icon_256x256.png'], [512, 'icon_256x256@2x.png'],
    [512, 'icon_512x512.png'], [1024, 'icon_512x512@2x.png'],
  ];
  for (const [size, name] of names) {
    execSync(`sips -z ${size} ${size} "${pngPath}" --out "${path.join(iconsetDir, name)}"`, { stdio: 'pipe' });
  }
  execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`, { stdio: 'pipe' });
  fs.rmSync(iconsetDir, { recursive: true, force: true });
}

export async function buildViewer(options: BuildOptions): Promise<string> {
  const { chatData, inputFolder, assetFiles, outputDir, appName, iconPath } = options;
  const chatName = chatData.metadata.chatName;

  const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
  const viewerDir = path.join(projectRoot, 'src/viewer');
  const tauriDir = path.join(projectRoot, 'src-tauri');
  const viteDist = path.join(viewerDir, 'dist');

  acquireLock(projectRoot);

  try {
    // 1. Build viewer with Vite (clean, no data injection into source)
    console.log('🔨 뷰어 빌드 중...');
    execSync('npx vite build', {
      cwd: viewerDir,
      stdio: 'pipe',
      env: { ...process.env },
    });
    console.log('  ✓ Vite 빌드 완료');

    // 2. Inject data into dist/ (build output only, source untouched)
    console.log('📦 에셋 주입 중...');
    const distAssetsDir = path.join(viteDist, 'assets');
    fs.mkdirSync(distAssetsDir, { recursive: true });

    for (const file of assetFiles) {
      fs.copyFileSync(path.join(inputFolder, file), path.join(distAssetsDir, file));
    }
    fs.writeFileSync(path.join(viteDist, 'chat-data.json'), JSON.stringify(chatData), 'utf-8');
    console.log(`  ✓ ${assetFiles.length}개 에셋 + 채팅 데이터 주입 완료`);

    // 3. Process and apply custom icon if provided
    const tauriIconPng = path.join(tauriDir, 'icons/icon.png');
    const tauriIconIcns = path.join(tauriDir, 'icons/icon.icns');
    const originalPng = fs.readFileSync(tauriIconPng);
    const originalIcns = fs.existsSync(tauriIconIcns) ? fs.readFileSync(tauriIconIcns) : null;

    if (iconPath) {
      // Crop-to-fill 1024x1024 using sips (macOS built-in)
      const tmpIcon = path.join(tauriDir, 'icons/.icon-tmp.png');
      fs.copyFileSync(iconPath, tmpIcon);
      const info = execSync(`sips -g pixelWidth -g pixelHeight "${tmpIcon}"`, { encoding: 'utf-8' });
      const w = parseInt(info.match(/pixelWidth:\s*(\d+)/)?.[1] ?? '0');
      const h = parseInt(info.match(/pixelHeight:\s*(\d+)/)?.[1] ?? '0');
      if (w > 0 && h > 0) {
        if (w < h) {
          execSync(`sips --resampleWidth 1024 "${tmpIcon}"`, { stdio: 'pipe' });
        } else {
          execSync(`sips --resampleHeight 1024 "${tmpIcon}"`, { stdio: 'pipe' });
        }
        execSync(`sips --cropToHeightWidth 1024 1024 "${tmpIcon}"`, { stdio: 'pipe' });
      }
      fs.renameSync(tmpIcon, tauriIconPng);

      // Generate .icns from processed PNG
      generateIcns(tauriIconPng, tauriIconIcns);
      console.log('  ✓ 커스텀 아이콘 적용');
    }

    // 4. Build with Tauri (config override via --config flag, no source modification)
    console.log('🍎 .app 빌드 중 (Tauri)...');
    // productName must be ASCII for Tauri build
    const configOverride = JSON.stringify({
      productName: 'KakaoChat',
      app: { windows: [{ title: '' }] },
    });

    try {
      execSync(`npx tauri build --target aarch64-apple-darwin --config '${configOverride}'`, {
        cwd: projectRoot,
        stdio: 'inherit',
        env: { ...process.env },
      });
    } catch (buildErr: any) {
      const stderr = buildErr.stderr?.toString() || buildErr.message || 'Unknown error';
      throw new Error(`Tauri 빌드 실패\n${stderr}`);
    }

    // Restore original icons
    if (iconPath) {
      fs.writeFileSync(tauriIconPng, originalPng);
      if (originalIcns) fs.writeFileSync(tauriIconIcns, originalIcns);
    }

    // 4. Copy .app to output
    const bundleMacosDir = path.join(tauriDir, 'target/aarch64-apple-darwin/release/bundle/macos');
    const appFiles = fs.existsSync(bundleMacosDir)
      ? fs.readdirSync(bundleMacosDir).filter(f => f.endsWith('.app'))
      : [];

    if (appFiles.length > 0) {
      const builtApp = path.join(bundleMacosDir, appFiles[0]);
      const finalPath = path.join(outputDir, `${appName}.app`);
      fs.rmSync(finalPath, { recursive: true, force: true });
      execSync(`cp -R "${builtApp}" "${finalPath}"`, { stdio: 'pipe' });

      console.log(`  ✓ .app 빌드 완료: ${finalPath}`);

      // Cleanup dist
      fs.rmSync(viteDist, { recursive: true, force: true });
      return finalPath;
    }

    throw new Error('빌드된 .app을 찾을 수 없습니다.');
  } catch (e: any) {
    // Fallback: output web folder
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
    releaseLock(projectRoot);
  }
}
