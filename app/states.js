'use strict';

/*
* States are the controller part of the Voxa's mvc model
* more info at http://voxa.readthedocs.io/en/latest/controllers.html
*/

exports.register = function register(skill) {
  /*
  * This event is triggered after new session has started
  * see more http://voxa.readthedocs.io/en/latest/statemachine-skill.html#Voxa.onRequestStarted
  */
  skill.onSessionStarted((alexaEvent) => {});
  /*
  * This event is triggered before the current session has ended
  * see more http://voxa.readthedocs.io/en/latest/statemachine-skill.html#Voxa.onSessionEnded
  */
  skill.onSessionEnded((alexaEvent) => {});
  /*
  * This can be used to plug new information in the request
  * see more http://voxa.readthedocs.io/en/latest/statemachine-skill.html#Voxa.onRequestStarted
  */
  skill.onRequestStarted((alexaEvent) => {});


  /**
   * If you want to handle a specific state onIntent
   * see more http://voxa.readthedocs.io/en/latest/controllers.html#the-onintent-helper
   * See more handlers at http://voxa.readthedocs.io/en/latest/statemachine-skill.html
   */

  skill.onIntent('LaunchIntent', () => ({ reply: 'Intent.Launch', to: 'Overview' }));

  // See how to manage the transition
  // http://voxa.readthedocs.io/en/latest/transition.html
  skill.onIntent('AMAZON.HelpIntent', () => ({ reply: 'Intent.Help', to: 'exit' }));


  skill.onState('exit', () => ({ reply: 'Intent.Exit', to: 'die' }));

  skill.onState('Overview', (alexaEvent) => {
    // Read more about alexaEvent at http://voxa.readthedocs.io/en/latest/alexa-event.html#AlexaEvent
    if (alexaEvent.intent.name === 'AMAZON.YesIntent') {
      return ({ to: 'AMAZON.HelpIntent' });
    }

    if (alexaEvent.intent.name === 'AMAZON.NoIntent') {
      return ({ to: 'exit' });
    }

    return ({ to: 'entry' });
  });

  /**
   * Error handlers
   * See more: http://voxa.readthedocs.io/en/latest/statemachine-skill.html#error-handlers
   */

  skill.onError(() => ({ reply: 'Error.General' }));
  skill.onUnhandledState(() => ({ reply: 'Error.General' }));
};
