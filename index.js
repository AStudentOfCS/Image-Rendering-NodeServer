const express = require('express');
const _ = require('lodash');
const lowdb = require('lowdb');
const FileAsync = require('lowdb/adapters/FileAsync');
const multer = require('multer');
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const app = express();

const packageJson = require('./package.json');

const adapter = new FileAsync('db.json');
const db = (async connection => {
  const dbConnection = await connection;
  await dbConnection.defaults({ resource: [], users: [] }).write();
  return dbConnection;
})(lowdb(adapter));

app.get('/', (req, res) => {
  res.json(
    _.pick(packageJson, ['name', 'version', 'description', 'author', 'license'])
  );
});

const allowTypes = process.env.ALLOW_TYPES.split(',').map(type => type.trim());
const uploadConfig = {
  fields: process.env.MAX_FIELD,
  files: process.env.MAX_FILE,
  fileSize: process.env.MAX_SIZE * 1048576,
  parts: process.env.MAX_PART
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, `${path.resolve(__dirname, 'public/resource')}`);
  },
  filename(req, { originalname, mimetype }, cb) {
    const nameSegments = originalname.split('.');
    const name = nameSegments[0] || `${Date.now()}`;
    const mineTypeSegments = mimetype.split('/');
    const ext = mineTypeSegments[1] || 'jpeg';

    cb(null, `${Date.now()}-${name}.${ext}`);
  }
});

const fileFilter = (req, { mimetype }, cb) =>
  cb(null, Boolean(allowTypes.indexOf(mimetype) > -1));

const uploader = multer({ storage, fileFilter, limits: uploadConfig });

// Serve images
app.get('/image/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const imgPath = path.resolve(__dirname, process.env.FOLDER_RESOURCE, id);

    if (!fs.existsSync(imgPath)) {
      throw new Error(`Image #${id} is not exist.`);
    }

    const imageStream = fs.createReadStream(imgPath);

    return imageStream.pipe(res);
  } catch (e) {
    return next(e);
  }
});

// Errors handler
app.use((err, req, res, next) => {
  const message =
    process.env.NODE_ENV !== 'production'
      ? err.message
      : 'An error encountered while processing images';

  res.status(500).json({ message });

  return next();
});

// Upload images and save in database
app.post('/upload', uploader.array('images'), async ({ files }, res) => {
  const dbInstance = await db;

  const insertQueue = [];
  const images = [];

  _.each(files, ({ filename, path: imagePath, size }) => {
    // Insert image info to db
    insertQueue.push(
      dbInstance
        .get('resource')
        .push({
          id: filename,
          name: filename,
          path: imagePath,
          size
        })
        .write()
    );

    // Prepare data to return to client
    images.push({
      name: filename
    });
  });

  await Promise.all(insertQueue);

  res.json({ images });
});

const port = process.env.PORT || 9999;
app.listen(port);
