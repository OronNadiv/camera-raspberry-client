const verbose = require('debug')('ha:socket-io:verbose')
const info = require('debug')('ha:socket-io:info')
const error = require('debug')('ha:socket-io:error')

const config = require('./config')
const io = require('socket.io-client')
const JWTGenerator = require('jwt-generator')
const jwtGenerator = new JWTGenerator(config.loginUrl, config.privateKey, true)
const jwt = require('jsonwebtoken')
const Promise = require('bluebird')
const url = require('url')

class SocketIO {
  constructor (ledClientUp) {
    this.ledClientUp = ledClientUp
  }

  _onError (err) {
    info('_onError called.  err:', err)
    try {
      if (err.type === 'UnauthorizedError' || err.code === 'invalid_token') {
        // redirect user to login page perhaps?
        info("User's token has expired")
      } else {
        error('Got an error from socket io.  err:', err)
      }
    } catch (err) {
      error('in _onError', err)
    }
  }

  _onReconnect (number) {
    info('_onReconnect called.  number:', number)
  }

  _onReconnectAttempt () {
    info('_onReconnectAttempt called.')

    try {
      const self = this

      if (self.reconnectTimer) {
        clearTimeout(self.reconnectTimer)
        self.reconnectTimer = null
      }
    } catch (err) {
      error('in _onReconnectAttempt', err)
    }
  }

  _onReconnectError (err) {
    info('_onReconnectError called.  err:', err)
  }

  _onReconnectFailed () {
    info('_onReconnectFailed called.')
  }

  _onReconnecting (number) {
    info('_onReconnecting called. number:', number)
  }

  _onConnect () {
    info('_onConnect called.')

    try {
      const self = this

      if (self.reconnectTimer) {
        clearTimeout(self.reconnectTimer)
        self.reconnectTimer = null
      }
      Promise
        .resolve(jwtGenerator.makeToken(self.options.subject, self.options.audience))
        .then(token => {
          info('emitting token. Token:', !!token)
          self.token = token
          self.socket.emit('authenticate', {token: self.token})
        })
        .catch(err => error('in _onConnect.catch', err))
    } catch (err) {
      error('in _onConnect', err)
    }
  }

  _onAuthenticated () {
    info('_onAuthenticated called.')

    try {
      const self = this

      self.socket.emit('join', self.options.rooms)
      Promise
        .resolve(self.ledClientUp.turnOn())
        .catch(err => error('in _onAuthenticated.catch', err))
    } catch (err) {
      error('in _onAuthenticated', err)
    }
  }

  _onUnauthorized (err) {
    info('_onUnauthorized called. err:', err)

    try {
      const self = this

      Promise
        .resolve(jwtGenerator.makeNewToken(self.options.subject, self.options.audience))
        .then(token => {
          info('emitting new token. Token:', !!token)
          self.token = token
          self.socket.emit('authenticate', {token: self.token})
        })
        .catch(err => error('in _onUnauthorized.catch', err))
    } catch (err) {
      error('in _onUnauthorized', err)
    }
  }

  _onDisconnect () {
    info('_onDisconnect called')

    try {
      const self = this

      self.reconnectTimer = setTimeout(self._createSocketAndConnect, 30000)
      Promise
        .resolve(self.ledClientUp.turnOff())
        .catch(err => error('in _onDisconnect.catch', err))
    } catch (err) {
      error('in _onDisconnect', err)
    }
  }

  _createSocketAndConnect () {
    info('_createSocketAndConnect called.')

    const self = this

    try {
      if (self.socket) {
        info('socket is not null.  Calling disconnect')
        self.socket.disconnect()
      }
    } catch (err) {
      error('while calling socket.disconnect', err)
    }
    const payload = jwt.decode(self.token)
    self.socket = io.connect(url.resolve(config.pushUrl, payload.group_id.toString()))
    info('payload:', payload)

    self.socket
      .on('error', self._onError.bind(self))
      .on('reconnect', self._onReconnect.bind(self))
      .on('reconnect_attempt', self._onReconnectAttempt.bind(self))
      .on('reconnecting', self._onReconnecting.bind(self))
      .on('reconnect_error', self._onReconnectError.bind(self))
      .on('reconnect_failed', self._onReconnectFailed.bind(self))
      .on('connect', self._onConnect.bind(self))
      .on('authenticated', self._onAuthenticated.bind(self))
      .on('unauthorized', self._onUnauthorized.bind(self))
      .on('disconnect', self._onDisconnect.bind(self))

    info('registered to events')

    self.options.events.forEach(event => self.socket.on(event.name, event.callback))
  }

  connect (options) {
    info('connect called.')
    verbose('options:', options)

    const self = this

    self.options = options

    return Promise
      .resolve(jwtGenerator.makeToken(self.options.subject, self.options.audience))
      .then(token => {
        info('token created.', 'token:', !!token)
        self.token = token
        return self._createSocketAndConnect()
      })
  }
}

module.exports = SocketIO
