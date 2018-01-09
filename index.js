const express = require('express');
const _ = require('lodash');
require('dotenv').config();

const app = express();

const packageJson = require('./package.json');

app.get('/', (req, res) => {
  res.json(
    _.pick(packageJson, ['name', 'version', 'description', 'author', 'license'])
  );
});

const port = process.env.PORT || 9999;
app.listen(port);
