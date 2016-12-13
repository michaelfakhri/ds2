'use strict'

const stream = require('pull-stream')
const pullDecode = require('pull-utf8-decoder')
const isNode = require('detect-node')
const PullBlobStore = (isNode) ? require('fs-pull-blob-store') : require('idb-pull-blob-store')

module.exports = class DatabaseManager {
  constructor (fileMetadata) {
    this.metadata = fileMetadata
    this.files = new PullBlobStore('files')
    this.config = new PullBlobStore('config')
  }

  configExists () {
    let config = this.config
    return new Promise(function (resolve, reject) {
      config.exists('config', function (err, exists) {
        if (err) return reject(err)
        resolve(exists)
      })
    })
  }

  getConfig () {
    let config = this.config
    return new Promise(function (resolve, reject) {
      stream(
        config.read('config'),
        pullDecode(),
        stream.drain(function (data) { resolve(JSON.parse(data)) },
          function (err) {
            if (err) return reject(err)
          })
      )
    })
  }

  storeConfig (jsonConfig) {
    return new Promise((resolve, reject) => {
      stream(
        stream.once(new Buffer(JSON.stringify(jsonConfig))),
        this.config.write('config', function (err) {
          if (err) return reject(err)
          resolve()
        })
      )
    })
  }
  fileExists (fileHash) {
    let storage = this.files
    return new Promise(function (resolve, reject) {
      storage.exists(fileHash, function (err, exists) {
        if (err) return reject(err)
        resolve(exists)
      })
    })
  }
  getFileWriter (fileHash, cb) {
    return this.files.write(fileHash, function (err) {
      if (err) return cb(err)
      cb()
    })
  }
  getFileReader (fileHash) {
    return this.files.read(fileHash)
  }
  removeFile (fileHash) {
    return new Promise((resolve, reject) => {
      this.files.remove(fileHash, function (err) {
        if (err) return reject(err)
        resolve()
      })
    })
  }
}
