import fs from 'node:fs';
import path from 'node:path';

export interface ValidationResult {
  valid: boolean;
  txtFile: string | null;
  assetFiles: string[];
  error: string | null;
}

const TXT_PATTERN = /^Talk_.+\.txt$/;
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm', '.3gp']);
const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db']);

export function validateInputFolder(folderPath: string): ValidationResult {
  const absPath = path.resolve(folderPath);

  if (!fs.existsSync(absPath)) {
    return { valid: false, txtFile: null, assetFiles: [], error: `경로가 존재하지 않습니다: ${absPath}` };
  }

  const stat = fs.statSync(absPath);
  if (!stat.isDirectory()) {
    return { valid: false, txtFile: null, assetFiles: [], error: `디렉토리가 아닙니다: ${absPath}` };
  }

  const entries = fs.readdirSync(absPath, { withFileTypes: true });

  // Check for nested directories (flat structure required)
  const subdirs = entries.filter(e => e.isDirectory());
  if (subdirs.length > 0) {
    return {
      valid: false,
      txtFile: null,
      assetFiles: [],
      error: `하위 폴더가 존재합니다. 카카오톡 내보내기는 플랫한 구조여야 합니다: ${subdirs.map(d => d.name).join(', ')}`,
    };
  }

  const files = entries
    .filter(e => e.isFile() && !IGNORED_FILES.has(e.name) && !e.name.startsWith('.'))
    .map(e => e.name);

  // Find txt files
  const txtFiles = files.filter(f => TXT_PATTERN.test(f));

  if (txtFiles.length === 0) {
    return { valid: false, txtFile: null, assetFiles: [], error: 'Talk_*.txt 파일을 찾을 수 없습니다.' };
  }

  if (txtFiles.length > 1) {
    return {
      valid: false,
      txtFile: null,
      assetFiles: [],
      error: `Talk_*.txt 파일이 여러 개입니다: ${txtFiles.join(', ')}. 하나의 내보내기 폴더만 지원합니다.`,
    };
  }

  const txtFile = txtFiles[0];
  const assetFiles = files.filter(f => f !== txtFile);

  // Validate txt file header
  const txtContent = fs.readFileSync(path.join(absPath, txtFile), 'utf-8');
  const lines = txtContent.split('\n');

  if (lines.length < 2 || !lines[1].startsWith('저장한 날짜')) {
    return {
      valid: false,
      txtFile: null,
      assetFiles: [],
      error: '카카오톡 내보내기 형식이 아닙니다. "저장한 날짜" 헤더가 없습니다.',
    };
  }

  return { valid: true, txtFile, assetFiles, error: null };
}

export function categorizeAssetFile(filename: string): 'image' | 'video' | 'other' {
  const ext = path.extname(filename).toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  return 'other';
}
