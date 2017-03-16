'use strict'

const Deferred = require('deferred')
const EE = require('events').EventEmitter
const Logger = require('logplease')
const MultihashingAsync = require('multihashing-async')
const PullStream = require('pull-stream')

const ConnectionHandler = require('./ConnectionHandler')
const DatabaseManager = require('./DatabaseManager')
const RequestHandler = require('./RequestHandler')

const FileRequest = require('./FileRequest')
const QueryRequest = require('./QueryRequest')

Logger.setLogLevel(Logger.LogLevels.ERROR)

const LOGGER = Logger.create('DS2', { color: Logger.Colors.Blue })
const DEFAULT_HOPS_QUERY = 5

module.exports = class DS2 {

  constructor (aFileMetadataHandler, options) {
    if (!aFileMetadataHandler) {
      throw new Error('Must specify at least the file metadataHandler')
    }

    options = options || {}

    this._EE = new EE()
    this._requestHandler = new RequestHandler(this._EE, options)
    this._connectionHandler = new ConnectionHandler(this._EE, options)
    this._db = new DatabaseManager(aFileMetadataHandler, this._EE, options)
  }

  start (aPeerId) {
    let self = this
    return self._db.start(aPeerId)
      .then(self._requestHandler.start.bind(self._requestHandler))
      .then(self._connectionHandler.start.bind(self._connectionHandler))
  }

  stop () {
    return Deferred.promisify(this._connectionHandler._node.stop.bind(this._connectionHandler._node))()
  }

  connect (aUserHashStr) {
    LOGGER.debug('Attempting to connect to ' + aUserHashStr)
    return this._connectionHandler.connect(aUserHashStr)
  }
  disconnect (aUserHashStr) {
    return this._connectionHandler.disconnect(aUserHashStr)
  }
  publish (aData, aMetadata) {
    var self = this
    return Deferred.promisify(MultihashingAsync)(Buffer(aData), 'sha2-256')
      .then((mh) => {
        var hash = MultihashingAsync.multihash.toB58String(mh)
        var def = Deferred()
        PullStream(
          PullStream.once(aData),
          self._db.getFileWriter(hash, function () {
            def.resolve(hash)
          })
        )
        return def.promise.then(() => self._db.storeMetadata(hash, aMetadata)).then(() => hash)
      })
  }

  view (aDataHashStr) {
    return this._db.getFile(aDataHashStr)
  }

  delete (aDataHashStr) {
    return this._db.deleteFile(aDataHashStr)
      .then(() => this._db.deleteMetadata(aDataHashStr))
  }

  copy (aDataHashStr, aUserHashStr) {
    let request = new FileRequest(aDataHashStr, aUserHashStr)
    this._EE.emit('IncomingRequest', request)
    return request.getDeferred().promise
  }

  query (aQueryStr, hops) {
    hops = (hops || hops === 0) ? hops : DEFAULT_HOPS_QUERY
    let request = new QueryRequest(aQueryStr, hops)
    this._EE.emit('IncomingRequest', request)
    return request.getDeferred().promise
  }

  getIdentity () {
    return this._connectionHandler.getIdentity()
  }

  getConnectedPeers () {
    return this._connectionHandler.getConnectedPeers()
  }
}
