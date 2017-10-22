const verbose = require('debug')('ha:index:verbose')
const info = require('debug')('ha:index:info')
const error = require('debug')('ha:index:error')

const Client = require('./client')
const config = require('./config')

const client = new Client()
const exit = require('./exit')

Promise
  .resolve(client.run())
  .then(() => info('Client is running.',
    'Login URL:', config.loginUrl,
    'Server URL:', config.serverUrl
  ))
  .catch(err => {
    error('Error while running client.', err)
    exit(2)
  })

setInterval(() => verbose('memory:', process.memoryUsage()), 1000 * 60 * 5)
