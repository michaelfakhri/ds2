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

  constructor (aPeerId) {
    let self = this
    this.dbManager = new DatabaseManager()
    return new Promise((resolve, reject) => {
      if (aPeerId) {
        resolve(aPeerId)
      } else {
        self.dbManager.configExists()
        .then(function (exists) {
          if (exists) {
            self.dbManager.getConfig()
            .then((peerInfo) => {
              PeerId.createFromJSON(peerInfo, (err, peerId) => {
                if (err) return reject(err)
                resolve(peerId)
              })
            })
          } else {
            PeerId.create((err, peerId) => {
              if (err) return reject(err)
              self.dbManager.storeConfig(peerId.toJSON())
              resolve(peerId)
            })
          }
        })
      }
    })
    .then((peerId) => {
      return new Promise((resolve, reject) => {
        var peerInfo = new PeerInfo(peerId)
        self.node = new Libp2PIpfsBrowser(peerInfo)
        var ma = '/libp2p-webrtc-star/ip4/127.0.0.1/tcp/15555/ws/ipfs/' + peerInfo.id.toB58String()
        peerInfo.multiaddr.add(ma)
        logger.debug('YOU CAN REACH ME AT ID = ' + peerInfo.id.toB58String())
        self.connectionHandler = new ConnectionHandler(self.node, self.dbManager)
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

  connectTo (userHash) {
    var ma = '/libp2p-webrtc-star/ip4/127.0.0.1/tcp/15555/ws/ipfs/' + userHash

    logger.debug('Attempting to connect to' + userHash)
    return this.connectionHandler.connectTo(ma)
  }
  disconnectFrom (userHash) {
    return this.connectionHandler.disconnectFrom(userHash)
  }
  publishFile (file, metadata) {
    var self = this
    return new Promise((resolve, reject) => {
      var reader = new FileReader() // eslint-disable-line no-undef
      reader.onload = function () {
        MultihashingAsync(MultihashingAsync.Buffer(reader.result), 'sha2-256', (err, mh) => {
          if (err) reject(err)
          var hash = MultihashingAsync.multihash.toB58String(mh)
          resolve(hash)
          stream(
            stream.once(reader.result),
            self.dbManager.getFileWriter(hash, function () {
            })// print hash resolve promise
          )
        })
      }
      reader.readAsArrayBuffer(file)
    })
  }
  deletePublishedFile (fileHash) {
    return this.dbManager.removeFile(fileHash)
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

