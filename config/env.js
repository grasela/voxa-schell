'use strict';

const _ = require('lodash');

function getEnv() {
  const NODE_ENV = process.env.NODE_ENV;
  const AWS_LAMBDA_FUNCTION_NAME = process.env.AWS_LAMBDA_FUNCTION_NAME;

  // Environment base on lambda function name
  // TODO put your own lambda function name here

  const AWS_LAMBDA_PRODUCTION_ENV = ['LAMBDA_FUNCTION_NAME_PROD']; // production

  if (NODE_ENV) {
    return NODE_ENV;
  }

  if (AWS_LAMBDA_FUNCTION_NAME) {
    if (_.includes(AWS_LAMBDA_PRODUCTION_ENV, AWS_LAMBDA_FUNCTION_NAME)) return 'production';

    return 'staging';
  }

  // Default local
  return 'local';
}

module.exports = getEnv();
