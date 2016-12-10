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

  constructor (node) {
    let self = this
    this.dbManager = new DatabaseManager()
    this.node = node || self.dbManager.configExists()
    .then(function (exists) {
      if (exists) {
        self.dbManager.getConfig()
        .then((peerInfo) => {
          PeerId.createFromJSON(peerInfo, function (err, peerId) {
            if (err) logger.error('ERROR: %s', err)
            var peerInfo = new PeerInfo(peerId)
            self.createNodeCommon(self, peerInfo)
          })
        })
      } else {
        PeerInfo.create((err, peerInfo) => {
          if (err) logger.error('ERROR: %s', err)
          self.dbManager.storeConfig(peerInfo.id.toJSON())
          self.createNodeCommon(self, peerInfo)
        })
      }
    })
    if (node) {
      self.node.start((err) => { if (err) logger.error(err) })
      logger.debug('YOU CAN REACH ME AT ID = ' + self.node.peerInfo.id.toB58String())
      self.connectionHandler = new ConnectionHandler(self.node, self.dbManager)
    }
  }
//* ****************************START OF PRIVATE METHODS************************************//
  createNodeCommon (self, peerInfo) {
    var ma = '/libp2p-webrtc-star/ip4/127.0.0.1/tcp/15555/ws/ipfs/' + peerInfo.id.toB58String()
    peerInfo.multiaddr.add(ma)
    logger.debug('YOU CAN REACH ME AT ID = ' + peerInfo.id.toB58String())
    self.node = new Libp2PIpfsBrowser(peerInfo)
    self.node.start((err) => { if (err) logger.error('ERROR: %s', err) })
    self.connectionHandler = new ConnectionHandler(self.node, self.dbManager)
  }

//* ****************************START OF PUBLIC API****************************************//

  connectTo (userHash) {
    logger.debug('Attempting to connect to' + userHash)
    this.connectionHandler.connectTo(userHash)
  }
  disconnectFrom (userHash) {
    this.connectionHandler.disconnectFrom(userHash)
  }
  publishFile (file, metadata) {
    var self = this
    var reader = new FileReader() // eslint-disable-line no-undef
    reader.onload = function () {
      MultihashingAsync(MultihashingAsync.Buffer(reader.result), 'sha2-256', (err, mh) => {
        if (err) logger.error(err)
        var hash = MultihashingAsync.multihash.toB58String(mh)
        logger.debug('hash was computed to be ' + hash)
        stream(
          stream.once(reader.result),
          self.dbManager.getFileWriter(hash, function () {})// print hash resolve promise
        )
      })
    }
    reader.readAsArrayBuffer(file)
  }
  deletePublishedFile (fileHash) {
    this.dbManager.removeFile(fileHash)
  }
  copyFilePublishedOverNetwork (fileHash, userHash) {
    return this.connectionHandler.sendFileRequest(fileHash, userHash)
  }
  query (queryJson) {
    return this.connectionHandler.sendQuery(queryJson)
  }
}

// up2pInstance = new UP2P()
// up2pInstance.connectTo('QmYMLihgZGFdYJfzb6dswUhX72ApmHLpUqi42ij9jAEf25')
// up2pInstance.query({}).then(function(result){console.log(result)})
// up2pInstance.connectTo('QmTjnjMUXtPddDKayE4uDr5bMqopSPdZRdyBqMXWQcs6Vq')

// connection interface
// connectionHandler.js
// ConnectTo(user)
// DisconnectFrom(user)
// reqFile(fileHash)
// reqFile(fileHash,user)
// reqQuery(query)

// File storage interface

