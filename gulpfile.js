'use strict'
const gulp = require('gulp')
const signalling = require('libp2p-webrtc-star/src/signalling')
const del = require('rimraf')

let server

require('aegir/gulp')(gulp)

// gulp lint from gulp tasks in aegir
// gulp test from gulp tasks in aegir
// gulp coverage from gulp tasks in aegir

gulp.task('test:browser:before', (done) => {
  serverStart(done)
})
gulp.task('test:browser:after', (done) => {
  server.stop(done)
})
gulp.task('test:node:before', (done) => {
  serverStart(done)
})
gulp.task('test:node:after', (done) => {
  del.sync('config')
  del.sync('files')
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
