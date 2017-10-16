const verbose = require('debug')('ha:pubnub:verbose')
const info = require('debug')('ha:pubnub:info')
const warn = require('debug')('ha:pubnub:warn')
const error = require('debug')('ha:pubnub:error')

const config = require('./config')
const pubnubSubscribe = require('home-automation-pubnub').Subscriber.subscribe
const {CONNECTED, RECONNECTED, ACCESS_DENIED, NETWORK_DOWN} = require('home-automation-pubnub').ListenerStatuses
const JWTGenerator = require('jwt-generator')
const jwtGenerator = new JWTGenerator({loginUrl: config.loginUrl, privateKey: config.privateKey, useRetry: true})
const jwt = require('jsonwebtoken')
const Promise = require('bluebird')
const diehard = require('diehard')

const subscribe = (ledClientUp, events, {subject, audience}) => {
  let _unsubscribe
  diehard.register((done) => {
    verbose('diehard - trigger.', '_unsubscribe:', _unsubscribe)
    if (_unsubscribe) {
      info('calling pubnub.unsubscribe.')
      Promise
        .resolve(_unsubscribe())
        .then(() => {
          info('pubnub.unsubscribe called.')
          done()
        })
        .catch((err) => {
          error('Unexpected error.', 'err:', err)
        })
        .finally(() => {
          _unsubscribe = null
        })
    }
  })
  const subscribeToPubnub = (token) => {
    info('subscribeToPubnub called.', 'token:', token)
    const decoded = jwt.decode(token)
    verbose('decoded token:', decoded)
    return pubnubSubscribe(
      {
        groupId: decoded.group_id,
        isTrusted: false,
        token,
        uuid: decoded.key
      },
      onMessage,
      onStatus
    )
  }

  const onStatus = (status) => {
    info('onStatus called.', 'status:', status)
    const {category} = status

    switch (category) {
      case CONNECTED:
      case RECONNECTED:
        verbose('Calling ledClientUp.turnOn')
        return Promise.resolve(ledClientUp.turnOn())
      case NETWORK_DOWN:
        verbose('Calling ledClientUp.turnOff')
        return Promise.resolve(ledClientUp.turnOff())
      case ACCESS_DENIED:
        info('Received ACCESS_DENIED.')
        return Promise
          .try(() => {
            verbose('_unsubscribe:', !!_unsubscribe)
            if (_unsubscribe) {
              info('calling unsubscribe.')
              return _unsubscribe()
            }
          })
          .catch((err) => {
            warn('error while calling unsubscribe.', 'err:', err)
          })
          .then(() => {
            info('calling makeNewToken.',
              'subject:', subject,
              'audience:', audience)
            return jwtGenerator.makeNewToken({subject, audience})
          })
          .then(token => {
            info('calling subscribeToPubnub.', 'token:', !!token)
            return subscribeToPubnub(token)
          })
          .then(({unsubscribe}) => {
            info('subscribeToPubnub complete successfully.', 'unsubscribe:', !!unsubscribe)
            _unsubscribe = unsubscribe
          })
          .catch((err) => {
            error('Unexpected error.', 'err:', err)
          })

      default:
        return info('Unhandled status code.', 'status:', status)
    }
  }
  const onMessage = ({system, type, payload}) => {
    info('received message.',
      'system:', system,
      'type:', type,
      'payload:', payload)

    const msgSystem = system
    const msgType = type

    events.forEach(({system, type, callback}) => {
      verbose('expected system:', system, 'expected type:', type, 'callback:', !!callback)
      if (system === msgSystem && type === msgType) {
        info('calling callback.', 'payload:', payload)
        callback(payload)
      }
    })
  }

  return Promise
    .resolve(jwtGenerator.makeToken({subject, audience}))
    .then((token) => subscribeToPubnub(token))
}

module.exports = subscribe
