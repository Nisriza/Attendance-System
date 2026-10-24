import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { supabase } from './supabase.js';

export const REPORT_BUCKET = 'report-attachments';

export interface UploadedFileLike {
  path?: string;
  buffer?: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.txt',
  '.csv',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
]);

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export function sanitizeOriginalName(name: string): string {
  const base = path.basename(String(name || 'file'));
  return base.replace(/[\u0000-\u001f<>:"/\\|?*]/g, '_').slice(0, 200) || 'file';
}

export function isAllowedReportFile(name: string): boolean {
  return ALLOWED_EXTENSIONS.has(path.extname(name).toLowerCase());
}

export function allowedExtensionsList(): string {
  return [...ALLOWED_EXTENSIONS].map((ext) => ext.replace('.', '')).join(', ');
}

function contentTypeFor(name: string, provided?: string): string {
  const ext = path.extname(name).toLowerCase();
  return MIME_BY_EXT[ext] || (provided && provided !== 'application/octet-stream' ? provided : 'application/octet-stream');
}

function client() {
  if (!supabase) throw new Error('Supabase Storage is not configured.');
  return supabase;
}

export interface StoredReportFile {
  original_name: string;
  stored_filename: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
}

export async function storeReportFile(
  reportId: string,
  file: UploadedFileLike
): Promise<StoredReportFile> {
  const originalName = sanitizeOriginalName(file.originalname);
  const ext = path.extname(originalName).toLowerCase();
  const storedFilename = `${crypto.randomUUID()}${ext}`;
  const storagePath = `reports/${reportId}/${storedFilename}`;
  const contentType = contentTypeFor(originalName, file.mimetype);
  const fileData = file.buffer
    ? file.buffer
    : file.path
      ? await fs.promises.readFile(file.path)
      : (() => { throw new Error(`No file data available for "${originalName}"`); })();

  const { error } = await client()
    .storage.from(REPORT_BUCKET)
    .upload(storagePath, fileData, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload "${originalName}" to secure storage: ${error.message}`);
  }

  return {
    original_name: originalName,
    stored_filename: storedFilename,
    storage_path: storagePath,
    mime_type: contentType,
    file_size: file.size,
  };
}

export async function removeStoredFiles(storagePaths: string[]): Promise<void> {
  const paths = storagePaths.filter(Boolean);
  if (paths.length === 0) return;
  try {
    const { error } = await client().storage.from(REPORT_BUCKET).remove(paths);
    if (error) console.error('[Storage] Failed to remove files:', error.message);
  } catch (err) {
    console.error('[Storage] Failed to remove files:', err);
  }
}

export async function downloadStoredFile(storagePath: string): Promise<Buffer> {
  const { data, error } = await client().storage.from(REPORT_BUCKET).download(storagePath);
  if (error || !data) {
    throw new Error(`File not found in secure storage: ${error?.message || 'unknown error'}`);
  }
  return Buffer.from(await data.arrayBuffer());
}

export function inferMimeType(name: string, provided?: string): string {
  return contentTypeFor(name, provided);
}
