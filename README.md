# my-radio



### Development Setup

* Install and use Node v6.10
* Run `npm install`
* Edit `config/local.json` with all of the requisite fields.

`npm install` will install the project dependencies
`npm run watch` will start the server and watch for changes.

* Try out your local server

```
curl -X POST \
  http://localhost:3000/skill \
  -H 'content-type: application/json' \
  -d '{
  "version": "1.0",
  "session": {
    "new": true,
    "sessionId": "session1234",
    "application": {
      "applicationId": "amzn1.echo-sdk-ams.app.1234"
    },
    "attributes": {},
    "user": {
      "userId": "fooUser"
    }
  },
  "request": {
    "type": "LaunchRequest",
    "requestId": "request5678",
    "timestamp": "2015-05-13T12:34:56Z"
  }
}'
```

### Configuration files

Voxa allows to setup multiple environment configuration. First it search for `NODE_ENV`. So in case is `NODE_ENV=production` it will search for `production.json`. If NODE_ENV is not specify, it searchs for a `AWS_LAMBDA_FUNCTION_NAME` variable.
If none of them are specify Voxa will set it up to local.

If you need a new environment simply create another json file like `test.json` then setup `NODE_ENV=test`. Voxa will search for `test.json` and apply the configuration.

> Web server will run on default port 3000
> Use [ngrok](https://ngrok.com/) - secure tunnels for development and test with a real device or a simulators

### Test and Simulators

Don't have a real device to test?. We got you cover try one of this simulators

  * [Reverb.ai](https://reverb.ai/) - Available on macOS, iOS, Android and Web
  * [Echosim.io](https://echosim.io/) - Available on Web

### Debugging

Voxa uses the debug module internally to log a number of different internal events, if you want have a look at those events you have to declare the following environment variable

`DEBUG=voxa`

### Directory Structure

	`config/` -> Environment variables or configuration
	`services/` -> API clients, Authentications and Extras
	`skill/` -> Amazon Echo Skill login, the state machine and flow
	`speechAssets/` -> Amazon Echo Utterances, Intent Schema and Custom Slots.
	`tests/` -> Unit Tests
	`server.js` -> Development server.
	`gulpfile.js` -> Gulp tasks
	`serverless.yml` -> Serverless configuration
	`package.json` -> Dependencies
	`README.md`

### Resources

  * [Documentation](http://voxa.readthedocs.io/en/latest/)
  * [Bug Tracker](https://github.com/mediarain/voxa/issues)
  * [Mail List](https://groups.google.com/d/forum/voxa-framework)
  * [IRC](irc://chat.freenode.net/voxa) (chat.freenode.net, #voxa)
