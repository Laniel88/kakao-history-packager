import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import sharp from 'sharp';
import type { ChatData, ChatItem, ChunkMetadata, ItemTypeHint, LinkEntry } from './types.js';

const CHUNK_SIZE = 500;
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;

function getTypeHint(item: ChatItem): ItemTypeHint {
  if (item.type === 'date-separator') return 'd';
  switch (item.contentType) {
    case 'photo': return 'p';
    case 'video': return 'v';
    case 'emoticon': return 'e';
    default: return 't';
  }
}

function extractLinks(items: ChatItem[]): LinkEntry[] {
  const links: LinkEntry[] = [];
  for (const item of items) {
    if (item.type !== 'message' || item.contentType !== 'text') continue;
    const matches = item.text.match(URL_REGEX);
    if (matches) {
      for (const url of matches) {
        links.push({ url, sender: item.sender, timestamp: item.timestamp });
      }
    }
  }
  return links;
}

function generateChunkedData(chatData: ChatData) {
  const { items } = chatData;
  const chunks: ChatItem[][] = [];
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    chunks.push(items.slice(i, i + CHUNK_SIZE));
  }

  const metadata: ChunkMetadata = {
    chatName: chatData.metadata.chatName,
    exportDate: chatData.metadata.exportDate,
    participants: chatData.metadata.participants,
    myName: chatData.metadata.myName,
    totalMessages: chatData.metadata.totalMessages,
    totalItems: items.length,
    chunkSize: CHUNK_SIZE,
    chunkCount: chunks.length,
    itemTypeHints: items.map(getTypeHint).join(''),
    assetManifest: chatData.assetManifest,
    links: extractLinks(items),
  };

  return { metadata, chunks };
}

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
  const buildResourcesDir = path.join(tauriDir, '.build-resources');

  acquireLock(projectRoot);

  try {
    // 1. Build viewer with Vite (only HTML/JS/CSS, no data)
    console.log('🔨 뷰어 빌드 중...');
    execSync('npx vite build', { cwd: viewerDir, stdio: 'pipe' });
    console.log('  ✓ Vite 빌드 완료');

    // 2. Stage resources (external files, NOT embedded in binary)
    console.log('📦 리소스 스테이징 중...');
    const resAssetsDir = path.join(buildResourcesDir, 'assets');
    const resDataDir = path.join(buildResourcesDir, 'data');
    fs.mkdirSync(resAssetsDir, { recursive: true });
    fs.mkdirSync(resDataDir, { recursive: true });

    for (const file of assetFiles) {
      fs.copyFileSync(path.join(inputFolder, file), path.join(resAssetsDir, file));
    }
    // Generate chunked data
    const { metadata, chunks } = generateChunkedData(chatData);
    fs.writeFileSync(path.join(resDataDir, 'metadata.json'), JSON.stringify(metadata), 'utf-8');
    const chunksDir = path.join(resDataDir, 'chunks');
    fs.mkdirSync(chunksDir, { recursive: true });
    for (let i = 0; i < chunks.length; i++) {
      fs.writeFileSync(path.join(chunksDir, `${i}.json`), JSON.stringify(chunks[i]), 'utf-8');
    }
    console.log(`  ✓ ${assetFiles.length}개 에셋 + 메타데이터 + ${chunks.length}개 청크 스테이징 완료`);

    // 3. Generate .icns into temp dir (source icons untouched)
    const iconSource = iconPath ?? path.join(tauriDir, 'icons/icon.png');
    console.log('🎨 아이콘 생성 중...');
    const icnsPath = await generateIcns(iconSource, buildIconsDir);
    console.log('  ✓ .icns 아이콘 생성 완료');

    // 4. Build with Tauri — resources externalized via bundle.resources
    console.log('🍎 .app 빌드 중 (Tauri)...');
    const configOverride = JSON.stringify({
      productName: 'KakaoChat',
      bundle: {
        icon: [path.relative(tauriDir, icnsPath)],
        resources: {
          '.build-resources/assets/*': 'assets/',
          '.build-resources/data/*': 'data/',
          '.build-resources/data/chunks/*': 'data/chunks/',
        },
      },
    });

    // Clean previous bundle to prevent stale resource caching
    const bundleDir = path.join(tauriDir, 'target/aarch64-apple-darwin/release/bundle');
    fs.rmSync(bundleDir, { recursive: true, force: true });

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
    fs.rmSync(buildResourcesDir, { recursive: true, force: true });
    fs.rmSync(viteDist, { recursive: true, force: true });
    releaseLock(projectRoot);
  }
}
