import { mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_UPLOAD_DIR = join(__dirname, "..", "uploads");
const TMP_UPLOAD_DIR = join(os.tmpdir(), "insightlm-uploads");
const UPLOAD_DIR = process.env.UPLOAD_DIR || (process.env.VERCEL ? TMP_UPLOAD_DIR : DEFAULT_UPLOAD_DIR);

export function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export function getUploadDir() {
  return UPLOAD_DIR;
}
