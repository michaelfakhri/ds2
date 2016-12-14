'use strict'

const isNode = require('detect-node')
const crypto = require('crypto')

const MAXIMUM_TIME_TO_LIVE_QUERY = 5
const MAXIMUM_TIME_TO_LIVE_FTP = 1

class Request {
  constructor (aRequest) {
    this.request = aRequest
  }
  setDuplicate () {
    this.request.isResponse = true
    this.request.timeToLive = 0
    this.request.isDuplicate = true
  }

  setResult (aResult) {
    this.request.isResponse = true
    this.request.timeToLive = 0
    this.request.result = aResult
  }
  isResponse () {
    return this.request.isResponse
  }
  decrementTimeToLive () {
    return --this.request.timeToLive
  }
  addToRoute (aUserHash) {
    this.request.route.push(aUserHash)
  }

  isDuplicate () {
    return this.request.isDuplicate
  }
  getRoute () {
    return this.request.route
  }
  getId () {
    return this.request.id
  }
  getResult () {
    return this.request.result
  }
  getFile () {
    return this.request.ftpRequest.file
  }
  isAccepted () {
    return this.request.result.accepted
  }
  serialize () {
    return JSON.stringify(this.request)
  }
}

exports = module.exports = Request

exports.create = function (myId, queryRequest, ftpRequest) {
  let request = {}

  if (queryRequest && ftpRequest) {
    throw new Error('A request cannot contain both a query and a ftp request')
  } else if (queryRequest) {
    request.queryRequest = queryRequest
    request.ftpRequest = undefined
    request.timeToLive = MAXIMUM_TIME_TO_LIVE_QUERY
  } else if (ftpRequest) {
    request.queryRequest = undefined
    request.ftpRequest = ftpRequest
    request.timeToLive = MAXIMUM_TIME_TO_LIVE_FTP
  }
  request.id = (isNode) ? crypto.randomBytes(32).readUIntBE(0, 8) : window.crypto.getRandomValues(new Uint32Array(1))[0]
  request.response = false
  request.route = [myId]
  request.isDuplicate = false
  request.isResponse = false
  request.result = undefined

  return new Request(request)
}

exports.createFromString = function (aReqStr) {
  return new Request(JSON.parse(aReqStr))
}
