'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');

const router = express.Router();
const {
  alexaSkill,
  dialogFlowAction,
} = require('./app');

const _ = require('lodash');

console.log(`${'Attempting to start.\r\n\t' +
  'Node version: '}${
  process.version
  }\r\n\tNODE_ENV: ${process.env.NODE_ENV}`);

const app = express();

app.all('/*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://ask-ifr-download.s3.amazonaws.com');
  req.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  next();
});

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

router.post('/alexa', (req, res, next) => {
  function callback(err, msg) {
    if (err) {
      console.error(err.message ? err.message : err);
      return next(err);
    }

    console.log(JSON.stringify(msg, null, 2));
    res.json(msg);
  }

  const context = {
    fail: err => callback(err),
    succeed: msg => callback(null, msg),
  };

  alexaSkill.execute(req.body, {})
    .then(context.succeed)
    .catch(context.fail);
});

router.post('/dialogFlow', (req, res, next) => {
  function callback(err, msg) {
    if (err) {
      console.error(err.message ? err.message : err);
      return next(err);
    }

    res.json(msg);
  }

  const context = {
    fail: err => callback(err),
    succeed: msg => callback(null, msg),
  };

  dialogFlowAction.execute(req.body, {})
    .then(context.succeed)
    .catch(context.fail);
});
app.use(router);

// The error handler must be before any other error middleware
const server = http.createServer(app);
server.listen(3000, () => {
  console.log('Server listening on port 3000.');
});
