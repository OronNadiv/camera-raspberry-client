const info = require('debug')('ha:led:info')

const diehard = require('diehard')
const Promise = require('bluebird')
const gpio = Promise.promisifyAll(require('pi-gpio'))

class LED {
  constructor (name, pin) {
    this.name = name
    this.pin = pin
  }

  turnOff () {
    return this.pin < 0
      ? Promise.resolve()
      : gpio.writeAsync(this.pin, 0)
  }

  turnOn () {
    return this.pin < 0
      ? Promise.resolve()
      : gpio.writeAsync(this.pin, 1)
  }

  initialize () {
    const self = this

    return self.pin < 0
      ? Promise.resolve()
      : gpio.openAsync(self.pin, 'output')
      .then(() => {
        info('opened.', self.name)
        diehard.register(done => {
          info('closing', self.name)
          gpio.close(self.pin, () => {
            info('closed', self.name)
            done()
          })
        })
      })
  }
}

module.exports = LED
