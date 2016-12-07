'use strict'

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const Libp2PIpfsBrowser = require('libp2p-ipfs-browser')
const MultihashingAsync = require('multihashing-async')
const stream = require('pull-stream')

const DatabaseManager = require('./databaseManager')
const ConnectionHandler = require('./connectionHandler')

module.exports = class UP2P {

  constructor () {
    this.node
    this.connectionHandler
    this.dbManager = new DatabaseManager()

    let self = this
    self.dbManager.configExists()
.then(function (exists) {
  if (exists) {
    self.dbManager.getConfig()
.then((peerInfo) => {
  PeerId.createFromJSON(peerInfo, function (err, peerId) {
    var peerInfo = new PeerInfo(peerId)
    self.createNodeCommon(self, peerInfo)
  })
})
  } else {
    PeerInfo.create((err, peerInfo) => {
      /* if (err)console.error(err) */
      self.dbManager.storeConfig(peerInfo.id.toJSON())
      self.createNodeCommon(self, peerInfo)
    })
  }
})
  }
//* ****************************START OF PRIVATE METHODS************************************//
  createNodeCommon (self, peerInfo) {
    var ma = '/libp2p-webrtc-star/ip4/127.0.0.1/tcp/8134/ws/ipfs/' + peerInfo.id.toB58String()
    peerInfo.multiaddr.add(ma)
    // console.debug("YOU CAN REACH ME AT ID = '" + peerInfo.id.toB58String() + "'")
    self.node = new Libp2PIpfsBrowser(peerInfo)
    self.node.start((err) => { /* if (err)console.error(err) */ })
    self.connectionHandler = new ConnectionHandler(self.node, self.dbManager)
  }

//* ****************************START OF PUBLIC API****************************************//

  connectTo (userHash) {
    // console.log('attempting to connect to' + userHash)
    this.connectionHandler.connectTo(userHash)
  }
  disconnectFrom (userHash) {
    this.connectionHandler.disconnectFrom(userHash)
  }
  publishFile (file, metadata) {
    var self = this
    var reader = new FileReader()
    reader.onload = function () {
      MultihashingAsync(MultihashingAsync.Buffer(reader.result), 'sha2-256', (err, mh) => {
        var hash = MultihashingAsync.multihash.toB58String(mh)
        // console.log('hash was computed to be ' + hash)
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

