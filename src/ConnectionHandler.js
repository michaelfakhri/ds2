'use strict'

const Deferred = require('deferred')
const Stream = require('pull-stream')
const Logger = require('logplease')
const PeerInfo = require('peer-info')
const PullDecode = require('pull-utf8-decoder')
const PullPushable = require('pull-pushable')

const Libp2p = require('./Libp2p')
const RequestFactory = require('./RequestFactory')

Logger.setLogLevel(Logger.LogLevels.DEBUG) // change to ERROR

const LOGGER = Logger.create('ConnectionHandler', { color: Logger.Colors.Blue })

module.exports = class ConnectionHandler {
  constructor (EE, options) {
    this._activeQueryConnections = {}
    this._activeFtpConnections = {}
    this._EE = EE
    this._myId
    this._node
    this._options = options
    this._signalling = options.signalling || '/libp2p-webrtc-star/ip4/127.0.0.1/tcp/15555/ws/ipfs/'

    this._EE.on('IncomingQueryRequest', this.onIncomingQueryRequest.bind(this))
    this._EE.on('IncomingFileRequest', this.onIncomingFileRequest.bind(this))
    this._EE.on('ReturnToSender', this.onReturnToSender.bind(this))
    this._EE.on('ReleaseConnection', this.onReleaseConnection.bind(this))
  }

  onIncomingQueryRequest (request) {
    let nrOfExpectedResponses = 0
    if (request.decrementTimeToLive() > 0) {
      nrOfExpectedResponses = this.sendRequestToAll(request)
    }
    request.setExpectedResponses(nrOfExpectedResponses + 1)
  }

  onIncomingFileRequest (request) {
    let self = this

    if (request.isRequestOriginThisNode()) {
      let userHash = request.getTarget()
      var deferredFile = request.getDeferred()
      if (!self._activeFtpConnections[userHash] || !self._activeQueryConnections[userHash]) {
        return deferredFile.reject(new Error('user is not connected'))
      }
      if (self._activeFtpConnections[userHash].activeIncoming) {
        return deferredFile.reject(new Error('There is a file currently being transferred'))
      }
      request.attachConnection(self._activeFtpConnections[userHash].connection)
      self._activeFtpConnections[userHash].activeIncoming = true
      self.sendRequestToUser(userHash, request)
    } else {
      request.attachConnection(self._activeFtpConnections[request.getRoute()[0]].connection)
    }
  }

  onReturnToSender (request) {
    var myIndex = request.getRoute().indexOf(this._myId)
    this.sendRequestToUser(request.getRoute()[myIndex - 1], request)
  }
  onReleaseConnection (userHash) {
    let self = this
    this._activeFtpConnections[userHash].activeIncoming = false
    var ma = this._signalling + userHash
    Deferred.promisify(self._node.dialByMultiaddr.bind(self._node))(ma, '/UP2P/fileTransfer')
      .then((conn) => self.initFtpStream(conn))
  }

  start (aPeerId) {
    let self = this
    let peerInfo = new PeerInfo(aPeerId)
    self._node = new Libp2p(peerInfo, self._options)
    self._node.handle('/UP2P/queryTransfer', (protocol, conn) => self.initQueryStream(conn))
    self._node.handle('/UP2P/fileTransfer', (protocol, conn) => self.initFtpStream(conn))
    let ma = this._signalling + aPeerId.toB58String()
    peerInfo.multiaddr.add(ma)
    LOGGER.debug('YOU CAN REACH ME AT ID = ' + aPeerId.toB58String())
    this._myId = aPeerId.toB58String()

    // return peer-id instance after libp2p node is started so other modules can use it
    return Deferred.promisify(self._node.start.bind(self._node))().then(() => aPeerId)
  }
  connect (userHash) {
    let ma = this._signalling + userHash
    let self = this
    return Deferred.promisify(self._node.dialByMultiaddr.bind(self._node))(ma, '/UP2P/queryTransfer')
      .then((conn) => self.initQueryStream(conn))
      .then(() => Deferred.promisify(self._node.dialByMultiaddr.bind(self._node))(ma, '/UP2P/fileTransfer'))
      .then((conn) => self.initFtpStream(conn))
  }

  disconnect (userHash) {
    let self = this
    var ma = self._signalling + userHash
    self.disconnectConnection(userHash)
    return Deferred.promisify(this._node.hangUpByMultiaddr.bind(this._node))(ma)
  }
  initQueryStream (connection) {
    var self = this
    var queryPusher = PullPushable()
    Stream(
      queryPusher, // data pusher
      connection, // p2p connection
      PullDecode(), // convert uint8 to utf8
      Stream.drain(self.queryTransferProtocolHandler.bind(self), // function called when data arrives
        (err, something) => {
          if (err && err.message !== 'socket hang up') throw err
          connection.getObservedAddrs(function (err, data) { if (err) throw err; var addr = data[0].toString().split('/'); self.disconnectConnection(addr[addr.length - 1]) })
        }
      ) // function called when stream is done
    )
    connection.getObservedAddrs(function (err, data) { if (err) throw err; var addr = data[0].toString().split('/'); self._activeQueryConnections[addr[addr.length - 1]] = queryPusher })
  }
  initFtpStream (conn) {
    var self = this
    conn.getObservedAddrs(function (err, data) { if (err) throw err; var addr = data[0].toString().split('/'); self._activeFtpConnections[addr[addr.length - 1]] = {connection: conn, activeIncoming: false} })
  }

  queryTransferProtocolHandler (request) {
    var parsedRequest = RequestFactory.getRequestFromStringJSON(request)
    if (parsedRequest.isResponse()) this._EE.emit('IncomingResponse', parsedRequest)
    else this._EE.emit('IncomingRequest', parsedRequest)
  }
  sendRequestToAll (query) {
    var count = 0
    for (var userHash in this._activeQueryConnections) {
      if (query.getRoute().indexOf(userHash) < 0) {
        this._activeQueryConnections[userHash].push(JSON.stringify(query.toJSON()))
        count++
      }
    }
    return count
  }
  sendRequestToUser (userHash, ftpRequest) {
    this._activeQueryConnections[userHash].push(JSON.stringify(ftpRequest.toJSON()))
  }
  disconnectConnection (userHash) {
    if (this._activeQueryConnections[userHash] || this._activeFtpConnections[userHash]) {
      this._activeQueryConnections[userHash].end()
      delete this._activeQueryConnections[userHash]
      delete this._activeFtpConnections[userHash]
    }
  }

  getIdentity () {
    return this._myId
  }

  getConnectedPeers () {
    return Object.keys(this._activeQueryConnections)
  }
}
