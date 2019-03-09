const info = require('debug')('ha:photographer:info')
const error = require('debug')('ha:photographer:error')

const config = require('./config')
const moment = require('moment')
const Promise = require('bluebird')
const Uploader = require('./uploader')

const gpiop = require('rpi-gpio').promise
const exec = Promise.promisify(require('child_process').exec)

const PIN_TAKING_PICTURES = config.pins.takingPictures

let count = 0
let until = moment()

class Photographer {
  constructor (count, until) {
    this.count = count || 0
    this.until = until || moment()
  }

  takePhotos () {
    info('takePhotos called.')
    count = Math.max(count, this.count)
    until = moment.max(until, this.until)

    const diff = until.diff(moment())

    if (count <= 0 && diff <= 0) {
      info('no more pictures to take.  count:', count, 'diff:', diff, 'until:', until.format())
      // another photographer is currently taking photos.
      return Promise.resolve()
    }

    const takePhoto = () => {
      info('takePhoto called.')
      const imageName = `image-${moment().valueOf()}.jpg`
      // https://www.raspberrypi.org/documentation/usage/camera/raspicam/raspistill.md
      info('calling exec raspistill.  imageName:', imageName)

      const command = ['raspistill', '-o', imageName]
      config.verticalFlip && command.push('-vf')
      config.horizontalFlip && command.push('-hf')
      return Promise
        .resolve(exec(command.join(' ')))
        .then(() => {
          const uploader = new Uploader([imageName])
          uploader.upload()
            .catch(err => error('at uploader.upload():', err))
        })
        .catch(err => error('before delay:', err))
        .delay(config.delayBetweenPhotos) // time to rest.
    }

    const repeat = () => {
      if (count > 0) {
        return takePhoto()
          .then(() => {
            count = count - 1
            return repeat()
          })
      }
      if (until.diff(moment()) > 0) {
        return takePhoto()
          .then(repeat)
      }
      return Promise.resolve()
    }

    return Promise
      .try(() => {
        info('Starting to take pictures.')
        return PIN_TAKING_PICTURES < 0
          ? Promise.resolve()
          : gpiop.write(PIN_TAKING_PICTURES, 1)
      })
      .then(repeat)
      .catch(err => error('before finally:', err))
      .finally(() => {
        info('Finishing taking pictures.')
        return PIN_TAKING_PICTURES < 0
          ? Promise.resolve()
          : gpiop.write(PIN_TAKING_PICTURES, 0)
      })
  }

  static stop () {
    count = 0
    until = moment()
    return Promise.resolve()
  }
}

module.exports = Photographer
