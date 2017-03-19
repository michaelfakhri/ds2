'use strict'

const Deferred = require('deferred')
const PeerId = require('peer-id')
const PullBlobStore = require('idb-pull-blob-store')
const PullDecode = require('pull-utf8-decoder')
const PullStream = require('pull-stream')

module.exports = class DatabaseManager {
  constructor (fileMetadata, EE) {
    this._config = new PullBlobStore('config')
    this._EE = EE
    this._metadata = fileMetadata
    this._myId
    this.files

    this._EE.on('IncomingQueryRequest', this.onIncomingQueryRequest.bind(this))
    this._EE.on('IncomingFileRequest', this.onIncomingFileRequest.bind(this))
    this._EE.on('IncomingFileResponse', this.onIncomingFileResponse.bind(this))
  }

  onIncomingQueryRequest (request) {
    let self = this
    self.queryMetadata(request.getQuery())
      .then((queryResult) => {
        if (request.isRequestOriginThisNode()) {
          request.resolve('local', queryResult)
        } else {
          request.resolve(self._myId, queryResult)
        }
        self._EE.emit('IncomingResponse', request)
      })
      .catch((err) => console.error(err.stack))
  }
  onIncomingFileRequest (request) {
    let self = this
    let fileHash = request.getFile()
    if (request.isRequestOriginThisNode()) {
      PullStream(
        request.getConnection(),
        self.getFileWriter(fileHash, function (err) {
          if (err) throw err
          self._EE.emit('ReleaseConnection', request.getTarget())
          request.getDeferred().resolve()
        })
      )
    } else {
      self.fileExists(request.getFile()).then(function (exists) {
        if (exists) {
          self.getMetadata(request.getFile()).then((metadata) => {
            request.accept(metadata)
            self._EE.emit('ReturnToSender', request)
            PullStream(
              self.getFileReader(request.getFile()),
              request.getConnection()
            )
          })
        } else {
          request.reject('File was not found in database')
          self._EE.emit('ReturnToSender', request)
        }
      })
    }
  }

  onIncomingFileResponse (request) {
    if (!request.isAccepted()) {
      request.getDeferred().reject(new Error(request.getError()))
    } else {
      console.e
      this.storeMetadata(request.getFile(), request.getMetadata())
    }
  }

  start (aPeerId) {
    let self = this
    return self.getConfig(aPeerId)
      .then((peerId) => {
        self.files = new PullBlobStore('files-' + peerId.toB58String())
        self._myId = peerId.toB58String()

        return peerId
      })
  }

  getConfig (aPeerId) {
    let self = this
    let def = Deferred()

    if (aPeerId) {
      def.resolve(aPeerId)
    } else {
      self.configExists()
      .then((exists) => {
        if (exists) {
          self.getConfigFromStorage()
            .then((peerIdJSON) => Deferred.promisify(PeerId.createFromJSON)(peerIdJSON))
            .then((peerId) => def.resolve(peerId))
        } else {
          Deferred.promisify(PeerId.create)()
          .then((peerId) => {
            self.storeConfig(peerId.toJSON())
              .then(() => def.resolve(peerId))
          })
        }
      })
    }

    // return peer-id instance so other modules can use it
    return def.promise
  }

  configExists () {
    return Deferred.promisify(this._config.exists.bind(this._config))('config')
  }

  getConfigFromStorage () {
    var def = Deferred()
    PullStream(
      this._config.read('config'),
      PullDecode(),
      PullStream.drain((data) => def.resolve(JSON.parse(data)), (err) => { if (err) return def.reject(err) })
    )
    return def.promise
  }

  storeConfig (jsonConfig) {
    var def = Deferred()
    PullStream(
      PullStream.once(new Buffer(JSON.stringify(jsonConfig))),
      this._config.write('config', (err) => { if (err) return def.reject(err); def.resolve() })
    )
    return def.promise
  }

  fileExists (fileHash) {
    return Deferred.promisify(this.files.exists.bind(this.files))(fileHash)
  }
  getFile (fileHash) {
    var def = Deferred()
    PullStream(
        this.getFileReader(fileHash),
        PullStream.flatten(),
        PullStream.collect((err, arr) => { if (err) return def.reject(err); def.resolve(arr) })
      )
    return def.promise
  }
  getFileWriter (fileHash, cb) {
    return this.files.write(fileHash, (err) => { if (err) return cb(err); cb() })
  }
  getFileReader (fileHash) {
    return this.files.read(fileHash)
  }
  deleteFile (fileHash) {
    return Deferred.promisify(this.files.remove.bind(this.files))(fileHash)
  }
  storeMetadata (fileHash, metadata) {
    return this._metadata.store(fileHash, metadata)
  }
  getMetadata (fileHash) {
    return this._metadata.get(fileHash)
  }
  queryMetadata (aQueryStr) {
    return this._metadata.query(aQueryStr)
  }
  deleteMetadata (fileHash) {
    return this._metadata.delete(fileHash)
  }
}
