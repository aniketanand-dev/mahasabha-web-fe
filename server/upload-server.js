const express = require('express');
const fs = require('fs/promises');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const rootDir = path.resolve(__dirname, '..');
const galleryFile = path.join(rootDir, 'data', 'gallery.json');
const uploadsRootDir = path.join(rootDir, 'public', 'uploads');
const allowedUploadFolders = new Set([
  'gallery',
  'navbar',
  'hero',
  'president',
  'bhavan',
  'leaders',
  'past-presidents',
  'events',
  'founders',
  'hostels',
]);

function applyCors(response, origin) {
  response.header('Access-Control-Allow-Origin', origin || '*');
  response.header('Vary', 'Origin');
  response.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  response.header('Access-Control-Allow-Headers', 'Content-Type');
}

function sanitizeBaseName(fileName) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'image';
}

function isManagedUploadPath(filePath) {
  return typeof filePath === 'string' && filePath.startsWith('/uploads/');
}

function isAllowedFolder(folder) {
  return typeof folder === 'string' && allowedUploadFolders.has(folder);
}

function getUploadFolder(request) {
  return request.params.folder || request.body.folder;
}

function createManagedSrc(folder, fileName) {
  return `/uploads/${folder}/${fileName}`;
}

function resolveManagedPath(src) {
  if (!isManagedUploadPath(src)) {
    return null;
  }

  const normalized = path.normalize(src.replace(/^\//, ''));
  const absolutePath = path.join(rootDir, 'public', normalized);
  const uploadsRootPath = path.join(rootDir, 'public', 'uploads');

  if (!absolutePath.startsWith(uploadsRootPath)) {
    return null;
  }

  return absolutePath;
}

async function ensureStorage(folder) {
  if (!isAllowedFolder(folder)) {
    throw new Error('Invalid upload folder.');
  }

  await fs.mkdir(path.join(uploadsRootDir, folder), { recursive: true });
}

async function readGallery() {
  try {
    const fileContent = await fs.readFile(galleryFile, 'utf8');
    const parsed = JSON.parse(fileContent);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function writeGallery(items) {
  await fs.writeFile(galleryFile, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
}

async function removeManagedFile(src) {
  const absolutePath = resolveManagedPath(src);

  if (!absolutePath) {
    return;
  }

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

const storage = multer.diskStorage({
  destination: async (request, _file, callback) => {
    try {
      const folder = getUploadFolder(request);

      if (!isAllowedFolder(folder)) {
        callback(new Error('Invalid upload folder.'));
        return;
      }

      await ensureStorage(folder);
      callback(null, path.join(uploadsRootDir, folder));
    } catch (error) {
      callback(error);
    }
  },
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname) || '.jpg';
    const safeName = sanitizeBaseName(file.originalname);
    callback(null, `${Date.now()}-${safeName}${extension.toLowerCase()}`);
  },
});

function imageFileFilter(_request, file, callback) {
  if (!file.mimetype.startsWith('image/')) {
    callback(new Error('Only image uploads are allowed.'));
    return;
  }
  callback(null, true);
}

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

// Dedicated multer for /api/gallery — destination hardcoded to 'gallery',
// so we never rely on request.body.folder being parsed before destination fires.
const galleryStorage = multer.diskStorage({
  destination: async (_request, _file, callback) => {
    try {
      await ensureStorage('gallery');
      callback(null, path.join(uploadsRootDir, 'gallery'));
    } catch (error) {
      callback(error);
    }
  },
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname) || '.jpg';
    const safeName = sanitizeBaseName(file.originalname);
    callback(null, `${Date.now()}-${safeName}${extension.toLowerCase()}`);
  },
});

const galleryUpload = multer({
  storage: galleryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

app.use((request, response, next) => {
  applyCors(response, request.headers.origin);

  if (request.method === 'OPTIONS') {
    response.status(204).send();
    return;
  }

  next();
});

app.use(express.json());
app.use('/uploads', express.static(uploadsRootDir));

app.post('/api/uploads/:folder', upload.single('image'), async (request, response, next) => {
  try {
    const folder = request.params.folder;

    if (!isAllowedFolder(folder)) {
      response.status(400).json({ message: 'Invalid upload folder.' });
      return;
    }

    if (!request.file) {
      response.status(400).json({ message: 'Image file is required.' });
      return;
    }

    response.status(201).json({
      src: createManagedSrc(folder, request.file.filename),
    });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/uploads', async (request, response, next) => {
  try {
    await removeManagedFile(request.body?.path);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/gallery', async (_request, response, next) => {
  try {
    response.json(await readGallery());
  } catch (error) {
    next(error);
  }
});

app.post('/api/gallery', galleryUpload.single('image'), async (request, response, next) => {
  try {
    if (!request.file) {
      response.status(400).json({ message: 'Image file is required.' });
      return;
    }

    const items = await readGallery();
    const created = {
      id: Date.now(),
      src: createManagedSrc('gallery', request.file.filename),
      caption: String(request.body.caption || '').trim(),
    };

    items.push(created);
    await writeGallery(items);
    response.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/gallery/:id', galleryUpload.single('image'), async (request, response, next) => {
  try {
    const itemId = Number(request.params.id);
    const items = await readGallery();
    const itemIndex = items.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
      if (request.file) {
        await fs.unlink(request.file.path);
      }

      response.status(404).json({ message: 'Gallery item not found.' });
      return;
    }

    const existingItem = items[itemIndex];
    const nextItem = {
      ...existingItem,
      caption: request.body.caption !== undefined ? String(request.body.caption).trim() : existingItem.caption,
    };

    if (request.file) {
      await removeManagedFile(existingItem.src);
      nextItem.src = createManagedSrc('gallery', request.file.filename);
    }

    items[itemIndex] = nextItem;
    await writeGallery(items);
    response.json(nextItem);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/gallery/:id', async (request, response, next) => {
  try {
    const itemId = Number(request.params.id);
    const items = await readGallery();
    const existingItem = items.find(item => item.id === itemId);

    if (!existingItem) {
      response.status(404).json({ message: 'Gallery item not found.' });
      return;
    }

    await removeManagedFile(existingItem.src);
    await writeGallery(items.filter(item => item.id !== itemId));
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  response.status(500).json({ message });
});

app.listen(PORT, async () => {
  await Promise.all([...allowedUploadFolders].map(folder => ensureStorage(folder)));
  console.log(`Local upload server running on http://localhost:${PORT}`);
});
