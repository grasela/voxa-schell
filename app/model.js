'use strict';

const _ = require('lodash');
const moment = require('moment-timezone');
const timezones = require('../content/time-zones');

class Model {
  constructor(data) {
    _.assign(this, data);
    this.locale = this.locale || 'en-US';
  }

  static fromEvent(alexaEvent) {
    const locale = _.get(alexaEvent, 'request.locale');
    const data = alexaEvent.session.attributes;

    data.locale = locale;
    return new Model(data);
  }

  get now() {
    const locale = this.locale.toLowerCase();
    return this.date ?
    moment(this.date).tz(timezones[locale]) :
    moment().tz(timezones[locale]);
  }

  get nowISO() {
    return this.now.toISOString();
  }

  set now(date) {
    if (_.isDate(date) || moment.isMoment(date)) {
      date = date.toISOString();
    }

    this.date = date;
  }

  serialize() {
    return this;
  }
}

module.exports = Model;