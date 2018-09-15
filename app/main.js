'use strict';

const _ = require('lodash');
const config = require('../config');
const Voxa = require('voxa');
const Storage = require('../services/Storage');

const debug = require('debug')('voxa');
const log = require('lambda-log');

const audioPlayerRequest = [
  'AudioPlayer.PlaybackStarted',
  'AudioPlayer.PlaybackFinished',
  'AudioPlayer.PlaybackStopped',
  'AudioPlayer.PlaybackFailed',
  'AudioPlayer.PlaybackNearlyFinished'];

// Array of states to be use in the app
const states = require('./states')

// Test state should be only available in development
// Test state add an intent to manally change time and reset user data
if (config.enableTestStates || process.env.QA_ENABLED) states.push(require('./states/test.states'));

function register(app) {
  states.register(app)

  app.onRequestStarted(logStart);
  app.onIntentRequest(logIntent);
  app.onAfterStateChanged(logTransition);
  app.onBeforeReplySent(logReply);

  app.onRequestStarted(startTimer);
  app.onBeforeReplySent(clearTimer);

  // Init app handlers
  app.onRequestStarted(getUserFromDB);
  app.onRequestStarted(loadPackTitle);

  app.onIntentRequest(sendEventIntent);

  app.onUnhandledState(onUnhandledState);

  // Error Handler
  app.onError(errorHandler);

  app.onBeforeReplySent(saveLastReply);
  app.onBeforeReplySent(saveLastVisit);
  app.onBeforeReplySent(saveUserToDynamo);

  Voxa.plugins.stateFlow(app);
  Voxa.plugins.replaceIntent(app);

  // Analytics
//   voxaGA(app, config.googleAnalytics);
//   voxaDashbot(app, config.dashbot);
  // if (!_.isEmpty(_.get(config, 'voiceLabs.token'))) voxaVoicelabs(app, config.voiceLabs);
  //

  function startTimer(voxaEvent, reply) {
    const context = voxaEvent.executionContext;
    if (!context.getRemainingTimeInMillis) { return; }
    const timeRemaining = context.getRemainingTimeInMillis();
    voxaEvent.timeoutError = setTimeout(async () => {
      const { user } = voxaEvent.model;
      const replies = {
        ACCOUNT_SUBSCRIBED: 'TimeOut_AuthSub',
        AUTH_FREE: 'TimeOut_AuthFree',
        NO_AUTH: 'TimeOut_Unsubscribed',
      };

      const statement = await voxaEvent.renderer.renderPath(`${replies[user.userType]}.ask`, voxaEvent);
      const reprompt = await voxaEvent.renderer.renderPath(`${replies[user.userType]}.reprompt`, voxaEvent);

      reply.clear();
      reply.addStatement(statement);
      reply.addReprompt(reprompt);

      context.succeed(reply);
    }, Math.max(timeRemaining - 500, 0));
  }

  function clearTimer(voxaEvent) {
    if (voxaEvent.timeoutError) {
      clearTimeout(voxaEvent.timeoutError);
    }
  }

  async function getUserFromDB(voxaEvent) {
    const store = new Storage(config.dynamoDB.tables.users);
    const userId = _.get(voxaEvent, 'context.System.user.userId') || voxaEvent.user.userId;
    const user = await store.get({ userId });
    _.set(voxaEvent, 'model.user', user);
  }

  // Handler functions
  async function errorHandler(event, err, reply) {
    event.log.error(err);
    await Promise.promisify(Raven.captureException, { context: Raven })(err);
    const statement = await event.renderer.renderPath('Exit_Msg.tell', event);
    reply.clear();
    reply.addStatement(statement);
    reply.terminate();
    return reply;
  }

  function saveLastVisit(voxaEvent) {
    if (voxaEvent.intent.name !== 'ResetIntent') {
      _.set(voxaEvent, 'model.user.lastVisit', voxaEvent.model.nowISO);
    }
  }

  function saveUserToDynamo(voxaEvent) {
    const store = new Storage(config.dynamoDB.tables.users);
    const userId = voxaEvent.user.userId;
    _.set(voxaEvent, 'model.user.userId', userId);
    _.unset(voxaEvent, 'model.user.accessToken');

    const intentName = voxaEvent.intent.name;
    const excludedIntents = [
      'TestReset',
      'AlexaSkillEvent.SkillDisabled',
      'AlexaSkillEvent.SkillEnabled',
    ];

    if (!_.includes(excludedIntents, intentName)) {
      return store.put(voxaEvent.model.user);
    }
  }

  function saveLastReply(request, reply, transition) {
    debug(JSON.stringify(reply, null, 2));
    const directives = _.get(reply, 'msg.directives');

    request.model.reply = _.pickBy({
      say: transition.say,
      to: transition.to.name,
      flow: transition.flow,
    });

    if (transition.dialogFlowMediaResponse) {
      request.model.reply.dialogFlowMediaResponse = transition.dialogFlowMediaResponse;
      request.model.reply.dialogFlowSuggestions = transition.dialogFlowSuggestions;
    }
  }

  
  async function loadPackTitle(request) {
    const user = _.get(request, 'model.user');
    const userType = _.get(user, 'userType');

    if (_.includes([User.USER_TYPE.AUTH_SUBSCRIBED, User.USER_TYPE.AUTH_FREE], userType) && _.get(request, 'model.packContent') !== api.EMPTY_RESPONSE) {
      const resp = await api.packContent(user, {});
      const data = _.get(resp, 'data');
      if (data && data.id) {
        _.set(request, 'model.packContent', data);
      }
    }

    if (_.includes([User.USER_TYPE.AUTH_SUBSCRIBED, User.USER_TYPE.AUTH_FREE], userType) && !_.get(request, 'model.EDHSContent')) {
      const data = {
        id: 4913,
        title: 'Deciphering life',
        description: '',
        duration: 5,
        smallImageUrl: 'https://hs-prod-content.imgix.net/evhs-header_180411__1523480193124.pdf?fm=png32&w=720&fs=png&fit=crop&h=480&crop=entropy&ixlib=js-1.0.5&s=5567d629a8e6f204d4476c29e63a5233',
        largeImageUrl: 'https://hs-prod-content.imgix.net/evhs-header_180411__1523480193124.pdf?fm=png32&w=1200&fs=png&fit=crop&h=800&crop=entropy&ixlib=js-1.0.5&s=54543447cc0675b0b9933c6c654698c0',
        backgroundImageUrl: 'https://hs-prod-content.imgix.net/evhs-header_180411__1523480193124.pdf?fm=png32&blend=B000&bm=normal&w=1024&fs=png&fit=crop&h=600&crop=entropy&ixlib=js-1.0.5&s=f07ec70319cecfcb72dc8b94b0dc82d9',
        audioUrl: 'https://d3jyalop6jpmn2.cloudfront.net/private/encoded/pack-evdh-mind-s274-5min-g-en__1525283201324_vbr_1ch_high_quality_mp3.mp3?Expires=1526430972&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9kM2p5YWxvcDZqcG1uMi5jbG91ZGZyb250Lm5ldC9wcml2YXRlL2VuY29kZWQvcGFjay1ldmRoLW1pbmQtczI3NC01bWluLWctZW5fXzE1MjUyODMyMDEzMjRfdmJyXzFjaF9oaWdoX3F1YWxpdHlfbXAzLm1wMyIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTUyNjQzMDk3Mn19fV19&Signature=nTq53MUPvNQGdP~dbMb7stkJGQl-rfV6X8d-YWCEvZPd6qoMXZVE5ofihlq7KBsvQ-0Qk7hHsug65lckGivqHPdpvKDTWvFf5ZO0GlN~czFw69vmX0NTVk~~XkTAoQS0Gf-RJzPZ5qSB8IFLYFNH4jDcU6dZ85TAe7gj~oPu1o3mSAJVVaAMtzqHawF3h6wWoIs6G7FeDmB-m6jj0QhMfjwkKbB6qAhMocHqmnjCgzA8-LIauGb769HPErF3THf4u2xE2yH8YyVoum0NocdnCliRgHpyCXz5wZQskHHJdRgyEvHY9GMVaNtQ6OIGXqd2Nw0qPmivP0opOlDKZuqN5w__&Key-Pair-Id=APKAJ2I2NJLNDMXV3PZA',
      };

      _.set(request, 'model.EDHSContent', data);
    }

    if (_.includes([User.USER_TYPE.AUTH_SUBSCRIBED, User.USER_TYPE.AUTH_FREE, User.USER_TYPE.NO_AUTH], userType) && !_.get(request, 'model.sleepSingleContent')) {
      const data = {
        id: 1641,
        title: 'Sleeping',
        description: 'Start to relax your body and let go of the day while easing into a restful night\'s sleep.',
        duration: 5,
        smallImageUrl: 'https://hs-staging-content.imgix.net/singles_sleeping_header__1488513500062.ai?fm=png32&w=720&fs=png&fit=crop&h=480&crop=entropy&ixlib=js-1.0.5&s=ee8cdf722c541fb9e4d80dfed22ffb78',
        largeImageUrl: 'https://hs-staging-content.imgix.net/singles_sleeping_header__1488513500062.ai?fm=png32&w=1200&fs=png&fit=crop&h=800&crop=entropy&ixlib=js-1.0.5&s=d46d1fe6110c8513d519cb74f45a1559',
        backgroundImageUrl: 'https://hs-staging-content.imgix.net/singles_sleeping_header__1488513500062.ai?fm=png32&blend=B000&bm=normal&w=1024&fs=png&fit=crop&h=600&crop=entropy&ixlib=js-1.0.5&s=824c0c83af6db4cd0bf9a6492d9a87c8',
        audioUrl: 'https://d35brl2uhklmme.cloudfront.net/private/encoded/single_sleeping_activity_5-m_en_2016-09-28__1488501264743_vbr_1ch_high_quality_mp3.mp3?Expires=1526430338&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9kMzVicmwydWhrbG1tZS5jbG91ZGZyb250Lm5ldC9wcml2YXRlL2VuY29kZWQvc2luZ2xlX3NsZWVwaW5nX2FjdGl2aXR5XzUtbV9lbl8yMDE2LTA5LTI4X18xNDg4NTAxMjY0NzQzX3Zicl8xY2hfaGlnaF9xdWFsaXR5X21wMy5tcDMiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE1MjY0MzAzMzh9fX1dfQ__&Signature=QMr3Q3Y3twJfQbJ7qMp7WqCwh8gh~k6hedV9CHNLNWRhjVWHj2o2lXVAinJEoaZsnFoEeOn9DAvN1ZhZFJj-KJLRZJ8GqZwJ4HnsvcFR~k8s-LuYsbANMTXm1XPihAOWuQ9vtRGAnD4GzALwOhnBT23UqqEYcO5MliaVOvIJ~tpXa3Spv2Qeorkc48zoX4X04LiF~Hfi5ZTBri~tlsWoaClZ4O255-MqZTeJ0UAW61ll3k4dipZBjLz3OyAvrKz0T-VF2yKebcoERz0i~ISVLOFLOz9hyM93yQyPXFpOVFB8DploKEPakVyHXj68seHLj7f092bXfjtFJO4evaMFHw__&Key-Pair-Id=APKAJ2I2NJLNDMXV3PZA',
      };

      _.set(request, 'model.sleepSingleContent', data);
    }

    if (_.includes([User.USER_TYPE.AUTH_SUBSCRIBED], userType) && !_.get(request, 'model.sleepSoundsContent')) {
      const data = {
        id: 3921,
        title: 'Sound: slumber',
        description: 'Not much compares to a good night\'s rest. Soothe the mind with these gentle sounds as you fall asleep.',
        duration: 10,
        smallImageUrl: 'https://hs-prod-content.imgix.net/singles_sleepsounds_slumber_header__1515795411050.ai?fm=png32&w=720&fs=png&fit=crop&h=480&crop=entropy&ixlib=js-1.0.5&s=d3718065009426611ec109b652d9d7d1',
        largeImageUrl: 'https://hs-prod-content.imgix.net/singles_sleepsounds_slumber_header__1515795411050.ai?fm=png32&w=1200&fs=png&fit=crop&h=800&crop=entropy&ixlib=js-1.0.5&s=d7a8549e19d70ef3afceb87f7b0ba36e',
        backgroundImageUrl: 'https://hs-prod-content.imgix.net/singles_sleepsounds_slumber_header__1515795411050.ai?fm=png32&blend=B000&bm=normal&w=1024&fs=png&fit=crop&h=600&crop=entropy&ixlib=js-1.0.5&s=b2f960a25bcaf77bb505596ed51224ff',
        audioUrl: 'https://d3jyalop6jpmn2.cloudfront.net/private/encoded/pack_evnh_sleepsounds_slumber_10m_180110__1515691622463_vbr_1ch_high_quality_mp3.mp3?Expires=1526430613&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9kM2p5YWxvcDZqcG1uMi5jbG91ZGZyb250Lm5ldC9wcml2YXRlL2VuY29kZWQvcGFja19ldm5oX3NsZWVwc291bmRzX3NsdW1iZXJfMTBtXzE4MDExMF9fMTUxNTY5MTYyMjQ2M192YnJfMWNoX2hpZ2hfcXVhbGl0eV9tcDMubXAzIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNTI2NDMwNjEzfX19XX0_&Signature=E4Y13~NrtM2oPKES4~IKIyDdUSJnWNr7GOxUEP84GnYM1sJSoVkutW~XYkGQx3zVjQoNBUvcM~BZqf00qHEsFkjFom~SYY~PhkwUJgGnXZeCHpN6YvM76z-jnqnEhEDjjpEADj3paVkXVMSBExK3ELIpkSLjb-htYofY4yDeA0S-mgmru57Czn5KUOD4zKIyGfwFrW-Nx-weGX1c0mZBB6H7GAT0KNJiw9pwr1fnz4nAWaC2DOLluhryWkul3UvKYcb4j1MZ9Hpksm4ZlwSnxkQsE~jpf98y-D0mL1Q233~Piw3RIeAN0wqeMs8sHCGtqJpTjDumeS53zT5r~NbEkQ__&Key-Pair-Id=APKAJ2I2NJLNDMXV3PZA',
      };

      _.set(request, 'model.sleepSoundsContent', data);
    }
  }

  function sendEventIntent(request) {
    return api.event('INTENT', request);
  }

  function onUnhandledState(voxaEvent, reply) {
    debug('unhandled', voxaEvent.intent.name);
    const directives = _.get(voxaEvent, 'session.attributes.reply.directives');
    const context = _.get(voxaEvent, 'rawEvent.result.contexts');
    const isMediaStatus = _.find(context, { name: 'actions_intent_media_status' });

    if (voxaEvent.intent && _.includes(audioPlayerRequest, voxaEvent.intent.name)) {
      return { flow: 'terminate' };
    }

    if (isMediaStatus && isMediaStatus.parameters.MEDIA_STATUS.status === 'FINISHED') {
      return { to: 'MEDIA_STATUS' };
    }

    if (isMediaStatus) {
      return { to: 'LaunchIntent' };
    }

    if (voxaEvent.session.new) {
      return { to: 'LaunchIntent' };
    }

    if (voxaEvent.intent.name === 'Display.ElementSelected') return { to: 'Display.ElementSelected' };

    // Close on negation/cancel/stop intents
    if (_.includes(['NoIntent'], voxaEvent.intent.name)) {
      return { to: 'exit' };
    }

    const lastReply = voxaEvent.model.reply.ask;
    reply = _.isArray(lastReply) ? _.last(lastReply) : lastReply;

    const response = {
      to: voxaEvent.model.reply.to,
      ask: _.filter(_.concat('Error.BadInput.say', reply)),
      directives,
    };

    return response;
  }
}

function logIntent(voxaEvent) {
  voxaEvent.log.info('Intent Request', { intent: voxaEvent.intent.name, params: voxaEvent.intent.params });
}

function logStart(voxaEvent) {
  const debugEnabled = _.includes(process.env.DEBUG, 'voxa');
  voxaEvent.log = new log.LambdaLog({
    requestId: voxaEvent.executionContext.awsRequestId,
    sessionId: voxaEvent.session.id,
  });

  voxaEvent.log.config.debug = debugEnabled;
  voxaEvent.log.config.dev = config.env === 'local';

  const event = _.cloneDeep(voxaEvent.rawEvent);

  voxaEvent.log.info('Got new event', { event });
  voxaEvent.log.debug('DEBUG is enabled');
}

function logReply(voxaEvent, reply) {
  const renderedReply = _.cloneDeep(reply);
  delete renderedReply.sessionAttributes;
  voxaEvent.log.info('Sent reply', { reply: renderedReply });
}

function logTransition(voxaEvent, reply, transition) {
  const clonedTransition = _.cloneDeep(transition);
  voxaEvent.log.info('Transition', { transition: clonedTransition });
}

module.exports.register = register;