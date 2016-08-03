const path = require('path')
const LOG_PREFIX = `"${path.basename(__filename)}":`
const log = require('./logger')
const verbose = log.verbose.bind(log, LOG_PREFIX)
const info = log.info.bind(log, LOG_PREFIX)
const error = log.error.bind(log, LOG_PREFIX)

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
