'use strict';

/**
 * Define all the replies to the user
 * See more http://voxa.readthedocs.io/en/latest/views-and-variables.html#views
 */

const views = (function views() {
  return {
    Intent: {
      // Use ask, tell, say, reprompt, card for your reply
      // See more: http://voxa.readthedocs.io/en/latest/reply.html
      Launch: {
        ask: '{helloWorld}. Time to take you on! Is there anything else i can help you with?',
        reprompt: 'If you say yes i can tell you where to find the documentation. ',
        card: {
          type: 'Simple',
          title: 'Congratulations, Your skill is alive!',
          content: 'Make sure to check Voxa\'s documentation at voxa.readthedocs.io',
        },
      },
      Help: {
        say: 'For Further details make sure to check the Voxa documentation at voxa.read the docs.io',
      },
      Exit: {
        tell: '<say-as interpret-as="interjection">au revoir.</say-as>',
      },
    },
    Error: {
      General: {
        tell: '<say-as interpret-as="interjection">d’oh.</say-as>Something went wrong',
      },
      UnhandleState: {
        tell: '<say-as interpret-as="interjection">aw man.</say-as>I\'m not sure what to do',
      },
    },
  };
}());
module.exports = views;
