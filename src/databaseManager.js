'use strict'

const stream = require('pull-stream')
const pullDecode = require('pull-utf8-decoder')
const PullBlobStore = require('idb-pull-blob-store')

module.exports = class DatabaseManager {
  constructor (fileMetadata) {
  // TODO: implement metadata handlng and verification
  // var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB
  // indexedDB.deleteDatabase('tempFileStorage')

  // this.tempFileStorage = new IdbPullBlobStore("tempFileStorage");
    this.fileStorage = new PullBlobStore('fileStorage')
    this.config = new PullBlobStore('config')
  }

  configExists () {
    let config = this.config
    return new Promise(function (resolve, reject) {
      config.exists('config', function (err, exists) {
        if (err)reject(err)
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
function (err) { if (err)reject(err) })
)
    })
  }

  storeConfig (jsonConfig) {
// TODO: verify JSON structure
    stream(
stream.once(JSON.stringify(jsonConfig)),
this.config.write('config', function (err) { if (err) throw err })
)
  }
  fileExists (fileHash) {
    let storage = this.fileStorage
    return new Promise(function (resolve, reject) {
      storage.exists(fileHash, function (err, exists) {
        if (err)reject(err)
        resolve(exists)
      })
    })
  }
  getFileWriter (fileHash, cb) {
    return this.fileStorage.write(fileHash, function (err) { if (err) throw err; cb() })
  }
  getFileReader (fileHash) {
    return this.fileStorage.read(fileHash)
  }
  removeFile (fileHash) {
    return new Promise((resolve, reject) => {
      this.fileStorage.remove(fileHash, function (err) {
        if (err) return reject(err)
        resolve()
      })
    })
  }
}
