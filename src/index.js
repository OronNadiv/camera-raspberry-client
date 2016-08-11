const verbose = require('debug')('ha:index:verbose')
const info = require('debug')('ha:index:info')
const error = require('debug')('ha:index:error')

const Client = require('./client')
const config = require('./config')

const client = new Client()

Promise
  .resolve(client.run())
  .then(() => info('Client is running.',
    'Login URL:', config.loginUrl,
    'Push URL:', config.pushUrl,
    'Server URL:', config.serverUrl
  ))
  .catch(err => {
    error('Error while running client.', err)
    process.exit(1)
  })

setInterval(() => verbose('memory:', process.memoryUsage()), 1000 * 60 * 5)
