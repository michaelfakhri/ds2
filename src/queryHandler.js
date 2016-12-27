'use strict'

const stream = require('pull-stream')
const pullPushable = require('pull-pushable')
const pullDecode = require('pull-utf8-decoder')
const Request = require('./request')

const deferred = require('deferred')
module.exports = class RequestHandler {
  constructor (aDbManager, aNode) {
    this.MAXIMUM_QUERY_TIME_PRIMARY = 15
    this.MAXIMUM_QUERY_TIME_SECONDARY = 5
    this.MAXIMUM_FILE_REQUEST_TIME = 20
    this.MAXIMUM_QUERY_TIME_RECENT = 5

    this.dbManager = aDbManager
    this.myId = aNode.peerInfo.id.toB58String()
    this.activeQueryConnections = {}
    this.activeFtpConnections = {}
    this.activeQueries = []
    this.activeFileRequests = []
    this.recentQueries = []
    this.node = aNode
  }

  buildAndSendQuery (query) {
    var self = this

    var queryToSend = Request.create(self.myId, query)
    var requestId = queryToSend.getId()
    var def = deferred()
    var nrOfExpectedResponses = self.sendRequestToAll(queryToSend)
    self.activeQueries[requestId.toString()] = {
      originalRequest: queryToSend,
      expectedResponses: nrOfExpectedResponses,
      receivedResponses: 0,
      def: def,
      responses: []
    }
    setTimeout(function () {
      var timedOutQuery = self.activeQueries[requestId.toString()]
      // could have been resolved by the transfer protocol
      if (timedOutQuery) {
        def.resolve(timedOutQuery.originalRequest)
        delete self.activeQueries[requestId.toString()]
      }
    }, self.MAXIMUM_QUERY_TIME_PRIMARY * 1000)
    return def.promise.then((request) => request.getResult())
  }
  requestProcessor (nrOfExpectedResponses, request) {
    let self = this
    var requestId = request.getId().toString()
    if (request.request.queryRequest) {
      var response = { id: self.myId }// TODO: ADD real response
      var def = deferred()
      def.promise.then(function (queryResult) {
        var myIndex = queryResult.getRoute().indexOf(self.myId)
        if (self.activeQueryConnections[queryResult.getRoute()[myIndex - 1]]) {
          self.activeQueryConnections[queryResult.getRoute()[myIndex - 1]].push(queryResult.serialize())
        }
      })
      var activeQuery = {
        originalRequest: request,
        expectedResponses: (nrOfExpectedResponses + 1), // +1 is my node
        receivedResponses: 0,
        def: def,
        responses: []
      }
      if (self.recentQueries.indexOf(request.getId().toString()) > -1) {
        let result = activeQuery.originalRequest
        result.setDuplicate()
        return def.resolve(result)
      } else {
        self.activeQueries[requestId] = activeQuery
      }
      self.recentQueries.push(requestId)
      setTimeout(() => self.recentQueries.shift(), self.MAXIMUM_QUERY_TIME_RECENT * 1000)
      activeQuery.responses.push(response)
      activeQuery.receivedResponses++
      if (activeQuery.expectedResponses === activeQuery.receivedResponses) {
        let result = activeQuery.originalRequest
        result.setResult(activeQuery.responses)
        def.resolve(result)
      } else {
        setTimeout(function () {
          var timedOutQuery = self.activeQueries[requestId]
          // could have been resolved by the transfer protocol
          if (timedOutQuery) {
            var result = timedOutQuery.originalRequest
            result.setResult(timedOutQuery.responses)
            def.resolve(result)
            delete self.activeQueries[requestId]
          }
        }, self.MAXIMUM_QUERY_TIME_SECONDARY * 1000)
      }
    } else {
      self.dbManager.fileExists(request.getFile()).then(function (exists) {
        if (exists) {
          request.setResult({ accepted: true })
          // add fileInfo
          stream(
            self.dbManager.getFileReader(request.getFile()),
            self.activeFtpConnections[request.getRoute()[0]].connection
          )
        } else {
          request.setResult({ accepted: false, error: 'file NOT found' })
        }
        self.activeQueryConnections[request.getRoute()[0]].push(request.serialize())
      })
    }
  }

  sendRequestToAll (query) {
    var count = 0
    for (var userHash in this.activeQueryConnections) {
      if (query.getRoute().indexOf(userHash) < 0) {
        this.activeQueryConnections[userHash].push(query.serialize())
        count++
      }
    }
    return count
  }
  sendRequestToUser (userHash, ftpRequest) {
    this.activeQueryConnections[userHash].push(ftpRequest.serialize())
  }

  initQueryStream (connection) {
    var self = this
    var queryPusher = pullPushable()
    stream(queryPusher, // data pusher
      connection, // p2p connection
      pullDecode(), // convert uint8 to utf8
      stream.drain(self.queryTransferProtocolHandler.bind(self), // function called when data arrives
        function (err) {
          if (err) console.error(err)
          connection.getObservedAddrs(function (err, data) {
            if (err) console.error(err)
            var addr = data[0].toString().split('/')
            self.disconnectConnection(addr[addr.length - 1])
          })
        }
      ) // function called when stream is done
    )
    connection.getObservedAddrs(function (err, data) { if (err) throw err; var addr = data[0].toString().split('/'); self.activeQueryConnections[addr[addr.length - 1]] = queryPusher })
  }
  initFtpStream (conn) {
    var self = this
    conn.getObservedAddrs(function (err, data) { if (err) throw err; var addr = data[0].toString().split('/'); self.activeFtpConnections[addr[addr.length - 1]] = {connection: conn, activeIncoming: false} })
  }
  queryTransferProtocolHandler (request) {
    var self = this
    var parsedRequest = Request.createFromString(request)
    if (!parsedRequest.isResponse()) {
      // new query handling
      var expectedNumberOfResponses = 0
      parsedRequest.addToRoute(self.myId)
      if (parsedRequest.decrementTimeToLive() > 0 && !self.recentQueries.indexOf(parsedRequest.getId().toString()) > -1) {
        expectedNumberOfResponses = this.sendRequestToAll(parsedRequest)
      }
      self.requestProcessor(expectedNumberOfResponses, parsedRequest)
    } else {
      if (parsedRequest.request.queryRequest) {
        // response propagation handling
        var activeQuery = this.activeQueries[parsedRequest.getId().toString()]
        if (activeQuery) {
          if (!parsedRequest.isDuplicate()) {
            parsedRequest.getResult().forEach((elementInArray) => activeQuery.responses.push(elementInArray))
          }
          activeQuery.receivedResponses++
          if (activeQuery.receivedResponses === activeQuery.expectedResponses) {
            var result = activeQuery.originalRequest
            result.setResult(activeQuery.responses)
            activeQuery.def.resolve(result)
            delete self.activeQueries[parsedRequest.getId().toString()]
          }
        }
      } else if (parsedRequest.request.ftpRequest) {
        self.activeFileRequests[parsedRequest.getId().toString()].responseReceived = true
        if (!parsedRequest.getResult().accepted) {
          self.activeFileRequests[parsedRequest.getId().toString()].def.reject(parsedRequest.getResult().error)
          delete self.activeFileRequests[parsedRequest.getId().toString()]
        } else {
        // store parsedRequest.result.fileInfo
        }
      }
    }
  }

  disconnectConnection (userHash) {
    if (this.activeQueryConnections[userHash]) this.activeQueryConnections[userHash].end()
    // TODO: Remove this forceful disconnection code
    delete this.activeQueryConnections[userHash]
    delete this.node.swarm.muxedConns[userHash]
  }

  buildAndSendFileRequest (fileHash, userHash) {
    var self = this
    if (!self.activeFtpConnections[userHash] || !self.activeQueryConnections[userHash]) {
      throw new Error('user is not connected')
    }
    if (self.activeFtpConnections[userHash].activeIncoming) {
      throw new Error('There is a currently active connection')
    }
    self.activeFtpConnections[userHash].activeIncoming = true

    var ftpRequestToSend = Request.create(self.myId, undefined, {file: fileHash})
    var requestId = ftpRequestToSend.getId()
    stream(
      self.activeFtpConnections[userHash].connection,
      self.dbManager.getFileWriter(fileHash, function (err) {
        if (err) throw err
        self.activeFtpConnections[userHash].activeIncoming = false
        self.activeFileRequests[requestId.toString()].def.resolve()
        delete self.activeFileRequests[requestId.toString()]
      })
    )

    var def = deferred()
    self.activeFileRequests[requestId.toString()] = {
      originalRequest: ftpRequestToSend,
      def: def,
      responseReceived: false
    }
    self.sendRequestToUser(userHash, ftpRequestToSend)
    setTimeout(function () {
      if (!self.activeFileRequests[requestId.toString()] || !self.activeFileRequests[requestId.toString()].responseReceived) {
        def.reject('Request TIMED OUT')
        delete self.activeFileRequests[requestId.toString()]
      }
    }, self.MAXIMUM_FILE_REQUEST_TIME * 1000)
    return def.promise
  }
}
