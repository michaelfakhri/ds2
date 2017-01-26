'use strict'
const gulp = require('gulp')
const signalling = require('libp2p-webrtc-star/src/sig-server')

let server

require('aegir/gulp')(gulp)

gulp.task('test:browser:before', (done) => {
  serverStart(done)
})

gulp.task('test:browser:after', (done) => {
  server.stop(done)
})

function serverStart (done) {
  signalling.start({
    host: '127.0.0.1',
    port: 15555
  }, (err, _server) => {
    if (err) {
      throw err
    }
    server = _server
    done()
  })
}
