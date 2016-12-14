'use strict'

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const Libp2PIpfsBrowser = require('libp2p-ipfs-browser')
const MultihashingAsync = require('multihashing-async')
const stream = require('pull-stream')
const Logger = require('logplease')
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
    return new Promise((resolve, reject) => {
      if (aPeerId) {
        resolve(aPeerId)
      } else {
        self.db.configExists()
        .then(function (exists) {
          if (exists) {
            self.db.getConfig()
            .then((peerInfo) => {
              PeerId.createFromJSON(peerInfo, (err, peerId) => {
                if (err) return reject(err)
                resolve(peerId)
              })
            })
          } else {
            PeerId.create((err, peerId) => {
              if (err) return reject(err)
              self.db.storeConfig(peerId.toJSON())
              .then(() => resolve(peerId))
            })
          }
        })
      }
    })
    .then((peerId) => {
      return new Promise((resolve, reject) => {
        this.db.setupFileStorage(peerId.toB58String())
        var peerInfo = new PeerInfo(peerId)
        self.node = new Libp2PIpfsBrowser(peerInfo)
        var ma = '/libp2p-webrtc-star/ip4/127.0.0.1/tcp/15555/ws/ipfs/' + peerId.toB58String()
        peerInfo.multiaddr.add(ma)
        logger.debug('YOU CAN REACH ME AT ID = ' + peerId.toB58String())
        self.connectionHandler = new ConnectionHandler(self.node, self.db)
        resolve(self)
      })
    })
  }

  start () {
    let self = this
    return new Promise((resolve, reject) => {
      self.node.start((err) => {
        if (err) return reject(err)
        resolve(self)
      })
    })
  }

  stop () {
    let self = this
    return new Promise((resolve, reject) => {
      self.node.stop((err) => {
        if (err) return reject(err)
        resolve(self)
      })
    })
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
    return new Promise((resolve, reject) => {
      MultihashingAsync(Buffer(aData), 'sha2-256', (err, mh) => {
        if (err) reject(err)
        var hash = MultihashingAsync.multihash.toB58String(mh)
        stream(
          stream.once(aData),
          self.db.getFileWriter(hash, function () {
            if (err) return reject(err)
            resolve(hash)
          })
        )
      })
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
