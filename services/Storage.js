const AWS = require('aws-sdk');
const debug = require('debug')('app');
const moment = require('moment-timezone');

class Storage {
  constructor(table) {
    this.client = new AWS.DynamoDB.DocumentClient();
    this.table = table;
    debug('UserStorage Table: %s', this.table);
  }

  get(user) {
    debug('Getting User %O', user);

    const { userId } = user;
    return this.client.get({
      TableName: this.table,
      Key: { userId },
    }).promise().then(item => item.Item);
  }

  put(data) {
    debug('Putting user %O', data);

    if (!data.createdDate) {
      data.createdDate = moment().toISOString();
    }

    return this.client.put({
      TableName: this.table,
      Item: data,
    }).promise();
  }
}

module.exports = Storage;