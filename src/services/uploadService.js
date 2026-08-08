import { randomUUID } from 'node:crypto';
import { readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/AppError.js';
import { EXTENSION_BY_MIME, MAGIC_BYTES_MATCH } from '../middlewares/upload.js';

const UPLOADS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');
const SAFE_FILENAME = /^[a-f0-9-]+\.[a-z0-9]+$/;

function assertLocalProvider() {
  if (env.storage.provider !== 'local') {
    throw new AppError(`Proveedor de almacenamiento "${env.storage.provider}" no está implementado`, 501);
  }
}

export async function saveFile(file) {
  assertLocalProvider();

  const matchesMagicBytes = MAGIC_BYTES_MATCH[file.mimetype];
  if (!matchesMagicBytes?.(file.buffer)) {
    throw new AppError('El contenido del archivo no coincide con su tipo declarado', 400);
  }

  const filename = `${randomUUID()}${EXTENSION_BY_MIME[file.mimetype]}`;
  await writeFile(path.join(UPLOADS_DIR, filename), file.buffer);
  return {
    filename,
    url: `${env.appUrl}/uploads/${filename}`,
    size: file.size,
    mimetype: file.mimetype,
  };
}

export async function listFiles() {
  assertLocalProvider();
  const entries = await readdir(UPLOADS_DIR);
  const files = await Promise.all(
    entries
      .filter((name) => SAFE_FILENAME.test(name))
      .map(async (name) => {
        const stats = await stat(path.join(UPLOADS_DIR, name));
        return {
          filename: name,
          url: `${env.appUrl}/uploads/${name}`,
          size: stats.size,
          createdAt: stats.birthtime,
        };
      })
  );
  return files;
}

export async function deleteFile(filename) {
  assertLocalProvider();
  if (!SAFE_FILENAME.test(filename)) throw new AppError('Nombre de archivo inválido', 400);

  try {
    await unlink(path.join(UPLOADS_DIR, filename));
  } catch (error) {
    if (error.code === 'ENOENT') throw new AppError('Archivo no encontrado', 404);
    throw error;
  }
}

// Limpieza best-effort cuando otro módulo reemplaza una imagen: si la URL
// anterior no es un archivo nuestro (dominio externo) o el provider no es
// local, no hace nada. Nunca tira: perder el archivo viejo no debe romper
// la operación principal (guardar el producto/evento/etc).
export async function deleteFileIfManaged(url) {
  if (!url || env.storage.provider !== 'local' || !url.startsWith(`${env.appUrl}/uploads/`)) return;

  const filename = url.slice(`${env.appUrl}/uploads/`.length);
  if (!SAFE_FILENAME.test(filename)) return;

  try {
    await unlink(path.join(UPLOADS_DIR, filename));
  } catch (error) {
    if (error.code !== 'ENOENT') logger.warn({ error, filename }, 'No se pudo limpiar el archivo reemplazado');
  }
}
