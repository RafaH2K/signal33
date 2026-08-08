import multer from 'multer';
import { AppError } from '../utils/AppError.js';

export const EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

// El Content-Type que manda el cliente es solo una etiqueta, no una garantía:
// esto verifica los primeros bytes del archivo contra la firma real del formato.
export const MAGIC_BYTES_MATCH = {
  'image/png': (buf) => buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/jpeg': (buf) => buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  'image/gif': (buf) => buf.subarray(0, 4).toString('ascii') === 'GIF8',
  'image/webp': (buf) =>
    buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP',
  'video/mp4': (buf) => buf.subarray(4, 8).toString('ascii') === 'ftyp',
  'video/quicktime': (buf) => ['ftyp', 'moov', 'free', 'mdat', 'wide'].includes(buf.subarray(4, 8).toString('ascii')),
  'video/webm': (buf) => buf.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(req, file, cb) {
    if (!EXTENSION_BY_MIME[file.mimetype]) {
      cb(new AppError(`Tipo de archivo no permitido: ${file.mimetype}`, 400));
      return;
    }
    cb(null, true);
  },
});
