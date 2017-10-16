const info = require('debug')('ha:uploader:info')

const config = require('./config')
const fs = require('fs')
const http = require('http-as-promised')
const JWTGenerator = require('jwt-generator')
const jwtGenerator = new JWTGenerator({loginUrl: config.loginUrl, privateKey: config.privateKey, useRetry: true})
const Promise = require('bluebird')
const url = require('url')

class Uploader {
  constructor (files) {
    this.files = files || []
  }

  static uploadAll () {
    info('uploadAll called.')
    const files = fs.readdirSync(__dirname).filter(file => {
      info('file:', file)
      if (!file.endsWith('.jpg')) {
        info('ignoring. file:', file)
        return false
      }
      return true
    })
    const uploader = new Uploader(files)
    return uploader.upload()
  }

  upload () {
    const self = this
    info('upload called. files:', self.files)
    if (!self.files.length) {
      info('files[] is empty.  Returning.')
      return Promise.resolve()
    }
    return Promise
      .try(() => {
        info('calling makeToken().')
        return jwtGenerator.makeToken({subject: '/files', audience: 'urn:home-automation/storage'})
      })
      .then(token => {
        info('token generated successfully.  Uploading image. self.files:', self.files)
        return Promise.map(self.files, file => {
          info('Uploading.  file:', file)
          return Promise
            .resolve(http({
              url: url.resolve(config.storageUrl, 'files'),
              method: 'POST',
              auth: {
                bearer: token
              },
              formData: {
                image: {
                  options: {
                    contentType: 'image/jpg',
                    filename: file
                  },
                  value: fs.createReadStream(file)
                }
              }
            }))
            .then(() => {
              info('Uploaded successfully.  file:', file)
              return fs.unlinkSync(file)
            })
            .then(() => info('file deleted successfully.  file:', file))
        })
      })
    // errors will be handled by the caller.
  }
}

module.exports = Uploader
