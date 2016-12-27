'use strict'

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const Libp2PIpfsBrowser = require('libp2p-ipfs-browser')
const MultihashingAsync = require('multihashing-async')
const stream = require('pull-stream')
const Logger = require('logplease')
const deferred = require('deferred')
Logger.setLogLevel(Logger.LogLevels.DEBUG) // change to ERROR

const logger = Logger.create('UP2P', { color: Logger.Colors.Blue })

const DatabaseManager = require('./databaseManager')
const ConnectionHandler = require('./connectionHandler')

module.exports = class UniversalPeerToPeer {

  constructor (aPeerId, aFileMetadataHandler) {
    this.db = new DatabaseManager(aFileMetadataHandler)

    if (!aPeerId && !aFileMetadataHandler) {
      // throw new Error('Must specify at least the file metadataHandler')
    }
    if (!aFileMetadataHandler) {
      // aFileMetadataHandler = aPeerId
      // aPeerId = undefined
    }
    let self = this
    let def = deferred()

    if (aPeerId) {
      def.resolve(aPeerId)
    } else {
      self.db.configExists()
      .then((exists) => {
        if (exists) {
          self.db.getConfig()
            .then((peerIdJSON) => deferred.promisify(PeerId.createFromJSON)(peerIdJSON))
            .then((peerId) => def.resolve(peerId))
        } else {
          deferred.promisify(PeerId.create)()
            .then((peerId) => {
              self.db.storeConfig(peerId.toJSON())
                .then(() => def.resolve(peerId))
            })
        }
      })
    }
    return def.promise.then((peerId) => {
      this.db.setupFileStorage(peerId.toB58String())
      var peerInfo = new PeerInfo(peerId)
      self.node = new Libp2PIpfsBrowser(peerInfo)
      var ma = '/libp2p-webrtc-star/ip4/127.0.0.1/tcp/15555/ws/ipfs/' + peerId.toB58String()
      peerInfo.multiaddr.add(ma)
      logger.debug('YOU CAN REACH ME AT ID = ' + peerId.toB58String())
      self.connectionHandler = new ConnectionHandler(self.node, self.db)
      return deferred(self)
    })
  }

  start () {
    return deferred.promisify(this.node.start.bind(this.node))()
  }

  stop () {
    return deferred.promisify(this.node.stop.bind(this.node))()
  }

  connect (aUserHashStr) {
    var ma = '/libp2p-webrtc-star/ip4/127.0.0.1/tcp/15555/ws/ipfs/' + aUserHashStr
    logger.debug('Attempting to connect to ' + aUserHashStr)
    return this.connectionHandler.connect(ma)
  }
  disconnect (aUserHashStr) {
    return this.connectionHandler.disconnect(aUserHashStr)
  }
  publish (aData, aMetadata) {
    var self = this
    return deferred.promisify(MultihashingAsync)(Buffer(aData), 'sha2-256')
      .then((mh) => {
        var hash = MultihashingAsync.multihash.toB58String(mh)
        var def = deferred()
        stream(
          stream.once(aData),
          self.db.getFileWriter(hash, function () {
            def.resolve(hash)
          })
        )
        return def.promise
      })
  }

  view (aDataHashStr) {
    return this.db.getFile(aDataHashStr)
  }

  delete (aDataHashStr) {
    return this.db.deleteFile(aDataHashStr)
  }

  copy (aDataHashStr, aUserHashStr) {
    return this.connectionHandler.sendFileRequest(aDataHashStr, aUserHashStr)
  }

  query (aQuery) {
    return this.connectionHandler.sendQuery(aQuery)
  }
}
module.exports.Buffer = Buffer
