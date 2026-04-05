import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { ChatData } from './types.js';

export interface BuildOptions {
  chatData: ChatData;
  inputFolder: string;
  assetFiles: string[];
  outputDir: string;
}

export async function buildViewer(options: BuildOptions): Promise<string> {
  const { chatData, inputFolder, assetFiles, outputDir } = options;
  const chatName = chatData.metadata.chatName;

  // 1. Create temp build directory
  const tmpDir = path.join(process.env.TMPDIR || '/tmp', `kakao-build-${randomUUID()}`);
  const distDir = path.join(tmpDir, 'dist');
  const assetsDir = path.join(distDir, 'assets');

  fs.mkdirSync(assetsDir, { recursive: true });

  console.log('📦 빌드 준비 중...');

  // 2. Copy assets (original quality)
  for (const file of assetFiles) {
    const src = path.join(inputFolder, file);
    const dest = path.join(assetsDir, file);
    fs.copyFileSync(src, dest);
  }
  console.log(`  ✓ ${assetFiles.length}개 에셋 복사 완료`);

  // 3. Write chat data JSON
  const dataPath = path.join(distDir, 'chat-data.json');
  fs.writeFileSync(dataPath, JSON.stringify(chatData), 'utf-8');
  console.log('  ✓ 채팅 데이터 생성 완료');

  // 4. Build viewer with Vite
  const viewerDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../viewer');
  console.log('🔨 뷰어 빌드 중...');

  // Copy viewer public assets (placeholder etc.)
  const viewerPublicDir = path.join(viewerDir, 'public');
  if (fs.existsSync(viewerPublicDir)) {
    const publicFiles = fs.readdirSync(viewerPublicDir).filter(f => !f.startsWith('.') && f !== 'chat-data.json' && f !== 'assets');
    for (const f of publicFiles) {
      const src = path.join(viewerPublicDir, f);
      if (fs.statSync(src).isFile()) {
        fs.copyFileSync(src, path.join(distDir, f));
      }
    }
  }

  // Write chat data to viewer's public for Vite build
  const viewerPublicData = path.join(viewerPublicDir, 'chat-data.json');
  fs.writeFileSync(viewerPublicData, JSON.stringify(chatData), 'utf-8');

  // Run Vite build
  execSync('npx vite build', {
    cwd: viewerDir,
    stdio: 'pipe',
    env: { ...process.env },
  });
  console.log('  ✓ Vite 빌드 완료');

  // Copy Vite output to dist
  const viteDist = path.join(viewerDir, 'dist');
  const viteIndex = path.join(viteDist, 'index.html');
  if (fs.existsSync(viteIndex)) {
    fs.copyFileSync(viteIndex, path.join(distDir, 'index.html'));
  }

  // Clean up Vite dist
  fs.rmSync(viteDist, { recursive: true, force: true });

  // 5. Build .app with Pake
  console.log('🍎 .app 빌드 중 (Pake)...');

  // Pake only accepts ASCII names; use temp name then rename
  const pakeName = 'KakaoChat';

  try {
    const pakeCmd = [
      'pake',
      `"${path.join(distDir, 'index.html')}"`,
      `--name "${pakeName}"`,
      '--use-local-file',
      '--hide-title-bar',
      '--width 420',
      '--height 720',
    ].join(' ');

    execSync(pakeCmd, {
      cwd: distDir,
      stdio: 'inherit',
      env: { ...process.env },
    });

    // Pake outputs a .dmg. Find it and extract .app from it.
    const possibleLocations = [distDir, tmpDir];
    let dmgPath: string | null = null;

    for (const loc of possibleLocations) {
      if (!fs.existsSync(loc)) continue;
      const files = fs.readdirSync(loc);
      const dmg = files.find(f => f.endsWith('.dmg'));
      if (dmg) {
        dmgPath = path.join(loc, dmg);
        break;
      }
    }

    if (dmgPath) {
      // Mount DMG, extract .app, unmount
      const mountPoint = path.join(tmpDir, 'dmg-mount');
      fs.mkdirSync(mountPoint, { recursive: true });

      execSync(`hdiutil attach "${dmgPath}" -mountpoint "${mountPoint}" -nobrowse -quiet`, { stdio: 'pipe' });

      const mountedFiles = fs.readdirSync(mountPoint);
      const appName = mountedFiles.find(f => f.endsWith('.app'));

      if (appName) {
        const finalPath = path.join(outputDir, `${chatName}.app`);
        fs.rmSync(finalPath, { recursive: true, force: true });
        // Copy .app from mounted DMG
        execSync(`cp -R "${path.join(mountPoint, appName)}" "${finalPath}"`, { stdio: 'pipe' });

        // Unmount
        execSync(`hdiutil detach "${mountPoint}" -quiet`, { stdio: 'pipe' });

        console.log(`  ✓ .app 빌드 완료: ${finalPath}`);

        // Cleanup
        fs.rmSync(tmpDir, { recursive: true, force: true });
        return finalPath;
      } else {
        execSync(`hdiutil detach "${mountPoint}" -quiet`, { stdio: 'pipe' });
        throw new Error('DMG 내에서 .app을 찾을 수 없습니다.');
      }
    } else {
      throw new Error('.dmg 파일을 찾을 수 없습니다.');
    }
  } catch (e) {
    // Fallback: output the dist folder as-is
    console.log('  ⚠ Pake 빌드 실패. 웹 폴더로 출력합니다.');
    const fallbackDir = path.join(outputDir, chatName);
    fs.rmSync(fallbackDir, { recursive: true, force: true });
    fs.renameSync(distDir, fallbackDir);

    // Cleanup tmp
    fs.rmSync(tmpDir, { recursive: true, force: true });

    console.log(`  ✓ 웹 폴더 출력 완료: ${fallbackDir}/index.html`);
    return fallbackDir;
  }
}
