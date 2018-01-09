const express = require('express');
const _ = require('lodash');
const multer = require('multer');
require('dotenv').config();

const path = require('path');
const app = express();

const packageJson = require('./package.json');

app.get('/', (req, res) => {
  res.json(
    _.pick(packageJson, ['name', 'version', 'description', 'author', 'license'])
  );
});

// Upload images
// const allowTypes = ['image/png', 'image/jpeg', 'image/gif'];
// const uploadConfig = {
//   fields: 17,
//   files: 17,
//   fileSize: 100 * 1048576,
//   parts: 17
// };

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

app.post('/upload', uploader.array('images'), (req, res) => {
  res.json({ images: req.files });
});

const port = process.env.PORT || 9999;
app.listen(port);
