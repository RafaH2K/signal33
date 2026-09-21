import { randomUUID } from 'node:crypto';
import { readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BlobServiceClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';

import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/AppError.js';
import {
  EXTENSION_BY_MIME,
  MAGIC_BYTES_MATCH,
} from '../middlewares/upload.js';

const UPLOADS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'uploads'
);

const SAFE_FILENAME = /^[a-f0-9-]+\.[a-z0-9]+$/;

const isAzure = () => env.storage.provider === 'azure';

let container;

function azureContainer() {
  container ??=
    BlobServiceClient
      .fromConnectionString(env.storage.azureConnectionString)
      .getContainerClient(env.storage.bucket || 'uploads');

  return container;
}

function assertProvider() {
  if (env.storage.provider !== 'local' && !isAzure()) {
    throw new AppError(
      `Proveedor de almacenamiento "${env.storage.provider}" no está implementado`,
      501
    );
  }
}

/**
 * Genera una URL SAS de solo lectura para un blob de Azure.
 *
 * La URL es válida durante 24 horas.
 */
function generateReadSasUrl(filename) {
  const connectionString = env.storage.azureConnectionString;

  const match = connectionString.match(
    /AccountName=([^;]+);AccountKey=([^;]+)/
  );

  if (!match) {
    throw new AppError(
      'La cadena de conexión de Azure Storage no contiene AccountName y AccountKey válidos',
      500
    );
  }

  const [, accountName, accountKey] = match;

  const credential = new StorageSharedKeyCredential(
    accountName,
    accountKey
  );

  const startsOn = new Date(Date.now() - 5 * 60 * 1000);

  const expiresOn = new Date(
    Date.now() + 24 * 60 * 60 * 1000
  );

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: env.storage.bucket || 'uploads',
      blobName: filename,
      permissions: BlobSASPermissions.parse('r'),
      startsOn,
      expiresOn,
    },
    credential
  ).toString();

  const blobClient = azureContainer().getBlockBlobClient(filename);

  return `${blobClient.url}?${sasToken}`;
}

// Prefijo base de las URLs que este servicio genera.
const publicPrefix = () =>
  isAzure()
    ? `${azureContainer().url}/`
    : `${env.appUrl}/uploads/`;

export async function saveFile(file) {
  assertProvider();

  const matchesMagicBytes = MAGIC_BYTES_MATCH[file.mimetype];

  if (!matchesMagicBytes?.(file.buffer)) {
    throw new AppError(
      'El contenido del archivo no coincide con su tipo declarado',
      400
    );
  }

  const extension = EXTENSION_BY_MIME[file.mimetype];

  if (!extension) {
    throw new AppError(
      `Tipo MIME no soportado: ${file.mimetype}`,
      400
    );
  }

  const filename = `${randomUUID()}${extension}`;

  if (isAzure()) {
    await azureContainer()
      .getBlockBlobClient(filename)
      .uploadData(file.buffer, {
        blobHTTPHeaders: {
          blobContentType: file.mimetype,
        },
      });
  } else {
    await writeFile(
      path.join(UPLOADS_DIR, filename),
      file.buffer
    );
  }

  const url = isAzure()
    ? generateReadSasUrl(filename)
    : `${publicPrefix()}${filename}`;

  return {
    filename,
    url,
    size: file.size,
    mimetype: file.mimetype,
  };
}

export async function listFiles() {
  assertProvider();

  if (isAzure()) {
    const files = [];

    for await (const blob of azureContainer().listBlobsFlat()) {
      if (!SAFE_FILENAME.test(blob.name)) continue;

      files.push({
        filename: blob.name,
        url: generateReadSasUrl(blob.name),
        size: blob.properties.contentLength,
        createdAt: blob.properties.createdOn,
      });
    }

    return files;
  }

  const entries = await readdir(UPLOADS_DIR);

  const files = await Promise.all(
    entries
      .filter((name) => SAFE_FILENAME.test(name))
      .map(async (name) => {
        const stats = await stat(
          path.join(UPLOADS_DIR, name)
        );

        return {
          filename: name,
          url: `${publicPrefix()}${name}`,
          size: stats.size,
          createdAt: stats.birthtime,
        };
      })
  );

  return files;
}

export async function deleteFile(filename) {
  assertProvider();

  if (!SAFE_FILENAME.test(filename)) {
    throw new AppError(
      'Nombre de archivo inválido',
      400
    );
  }

  if (isAzure()) {
    try {
      await azureContainer().deleteBlob(filename);
    } catch (error) {
      if (error.statusCode === 404) {
        throw new AppError(
          'Archivo no encontrado',
          404
        );
      }

      throw error;
    }

    return;
  }

  try {
    await unlink(
      path.join(UPLOADS_DIR, filename)
    );
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new AppError(
        'Archivo no encontrado',
        404
      );
    }

    throw error;
  }
}

// Limpieza best-effort cuando otro módulo reemplaza una imagen.
export async function deleteFileIfManaged(url) {
  if (
    !url ||
    (env.storage.provider !== 'local' && !isAzure()) ||
    !url.startsWith(publicPrefix())
  ) {
    return;
  }

  // Elimina cualquier query string de SAS.
  const filename = url
    .slice(publicPrefix().length)
    .split('?')[0];

  if (!SAFE_FILENAME.test(filename)) {
    return;
  }

  try {
    if (isAzure()) {
      await azureContainer().deleteBlob(filename);
    } else {
      await unlink(
        path.join(UPLOADS_DIR, filename)
      );
    }
  } catch (error) {
    if (
      error.code !== 'ENOENT' &&
      error.statusCode !== 404
    ) {
      logger.warn(
        {
          error,
          filename,
        },
        'No se pudo limpiar el archivo reemplazado'
      );
    }
  }
}
