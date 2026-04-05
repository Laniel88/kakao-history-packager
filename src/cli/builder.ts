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

export async function buildViewer(options: BuildOptions): Promise<string> {
  const { chatData, inputFolder, assetFiles, outputDir } = options;
  const chatName = chatData.metadata.chatName;

  const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
  const viewerDir = path.join(projectRoot, 'src/viewer');
  const tauriDir = path.join(projectRoot, 'src-tauri');
  const viewerPublicDir = path.join(viewerDir, 'public');

  console.log('📦 빌드 준비 중...');

  // 1. Copy assets to viewer public (for Vite build to pick up)
  const publicAssetsDir = path.join(viewerPublicDir, 'assets');
  fs.mkdirSync(publicAssetsDir, { recursive: true });

  for (const file of assetFiles) {
    fs.copyFileSync(path.join(inputFolder, file), path.join(publicAssetsDir, file));
  }
  console.log(`  ✓ ${assetFiles.length}개 에셋 복사 완료`);

  // 2. Write chat data JSON
  fs.writeFileSync(path.join(viewerPublicDir, 'chat-data.json'), JSON.stringify(chatData), 'utf-8');
  console.log('  ✓ 채팅 데이터 생성 완료');

  // 3. Build viewer with Vite
  console.log('🔨 뷰어 빌드 중...');
  execSync('npx vite build', {
    cwd: viewerDir,
    stdio: 'pipe',
    env: { ...process.env },
  });

  // Copy assets to Vite dist (vite-plugin-singlefile inlines JS/CSS but not media)
  const viteDist = path.join(viewerDir, 'dist');
  const viteDistAssets = path.join(viteDist, 'assets');
  fs.mkdirSync(viteDistAssets, { recursive: true });
  for (const file of assetFiles) {
    fs.copyFileSync(path.join(inputFolder, file), path.join(viteDistAssets, file));
  }
  // Copy chat-data.json to dist
  fs.copyFileSync(path.join(viewerPublicDir, 'chat-data.json'), path.join(viteDist, 'chat-data.json'));
  console.log('  ✓ Vite 빌드 완료');

  // 4. Update tauri.conf.json with chat name
  const tauriConfPath = path.join(tauriDir, 'tauri.conf.json');
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'));
  const originalConf = JSON.stringify(tauriConf); // save for restore
  tauriConf.productName = 'KakaoChat'; // ASCII for build
  tauriConf.app.windows[0].title = '';
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2), 'utf-8');

  // 5. Build with Tauri
  console.log('🍎 .app 빌드 중 (Tauri)...');

  try {
    execSync('npx tauri build --target aarch64-apple-darwin', {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env },
    });

    // Find the built .app
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

      // Cleanup
      fs.rmSync(viteDist, { recursive: true, force: true });
      fs.writeFileSync(tauriConfPath, originalConf, 'utf-8');

      return finalPath;
    }

    throw new Error('빌드된 .app을 찾을 수 없습니다.');
  } catch (e) {
    // Restore tauri.conf.json
    fs.writeFileSync(tauriConfPath, originalConf, 'utf-8');

    // Fallback: output web folder
    console.log('  ⚠ Tauri 빌드 실패. 웹 폴더로 출력합니다.');
    const fallbackDir = path.join(outputDir, chatName);
    fs.rmSync(fallbackDir, { recursive: true, force: true });
    fs.renameSync(viteDist, fallbackDir);

    console.log(`  ✓ 웹 폴더 출력 완료: ${fallbackDir}/index.html`);
    return fallbackDir;
  }
}
