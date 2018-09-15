'use strict';

const voxa = require('voxa');
const alexaStates = require('./states/alexa.states');
const dialogFlowStates = require('./states/dialogFlow.states');
const Model = require('./model');
const variables = require('./variables');
const views = require('./views');

// Include the state machine module, the state machine,
// the responses and variables to be used in this skill
const main = require('./main');

const app = new voxa.VoxaApp({ variables, views, Model });
main.register(app);

// alexa
const alexaSkill = new voxa.AlexaPlatform(app);
alexaStates.register(alexaSkill);
alexaSkill.app.directiveHandlers.push(alexaStates.MetaDataPlayAudioDirective);
exports.alexaSkill = alexaSkill;

// dialogFlow
const dialogFlowAction = new voxa.DialogFlowPlatform(app);
dialogFlowStates.register(dialogFlowAction);
exports.dialogFlowAction = dialogFlowAction;