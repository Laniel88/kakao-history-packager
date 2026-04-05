import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import type { ChatData } from './types.js';

export interface BuildOptions {
  chatData: ChatData;
  inputFolder: string;
  assetFiles: string[];
  outputDir: string;
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

export async function buildViewer(options: BuildOptions): Promise<string> {
  const { chatData, inputFolder, assetFiles, outputDir } = options;
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

    // 3. Build with Tauri (config override via --config flag, no source modification)
    console.log('🍎 .app 빌드 중 (Tauri)...');
    const configOverride = JSON.stringify({
      productName: 'KakaoChat',
      app: { windows: [{ title: '' }] },
    });

    execSync(`npx tauri build --target aarch64-apple-darwin --config '${configOverride}'`, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env },
    });

    // 4. Copy .app to output
    const bundleMacosDir = path.join(tauriDir, 'target/aarch64-apple-darwin/release/bundle/macos');
    const appFiles = fs.existsSync(bundleMacosDir)
      ? fs.readdirSync(bundleMacosDir).filter(f => f.endsWith('.app'))
      : [];

    if (appFiles.length > 0) {
      const builtApp = path.join(bundleMacosDir, appFiles[0]);
      const finalPath = path.join(outputDir, `${chatName}.app`);
      fs.rmSync(finalPath, { recursive: true, force: true });
      execSync(`cp -R "${builtApp}" "${finalPath}"`, { stdio: 'pipe' });

      console.log(`  ✓ .app 빌드 완료: ${finalPath}`);

      // Cleanup dist
      fs.rmSync(viteDist, { recursive: true, force: true });
      return finalPath;
    }

    throw new Error('빌드된 .app을 찾을 수 없습니다.');
  } catch (e) {
    // Fallback: output web folder
    if (fs.existsSync(viteDist)) {
      console.log('  ⚠ Tauri 빌드 실패. 웹 폴더로 출력합니다.');
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
