import fs from 'fs';
import path from 'path';
import multer from 'multer';

const uploadDir = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeBase = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]+/g, '_');
    const ts = Date.now();
    cb(null, `${ts}_${safeBase}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_BYTES || 25 * 1024 * 1024), // 25MB default
  },
});

export function buildPublicUrl(filename: string): string {
  // Serve via /uploads
  return `/uploads/${encodeURIComponent(filename)}`;
}


