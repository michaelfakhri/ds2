'use strict'
const gulp = require('gulp')
const eslint = require('gulp-eslint')

const signalling = require('libp2p-webrtc-star/src/signalling')
let server

require('aegir/gulp')(gulp)

gulp.task('lint-n-fix-src', () => {
  return gulp.src('src/*.js')
        .pipe(eslint({fix: true}))
  .pipe(eslint.format())
  // if fixed, write the file to dest
  .pipe(gulp.dest('src'))
  // .pipe(eslint.failAfterError());
})

gulp.task('test:browser:before', (done) => {
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
})

gulp.task('test:browser:after', (done) => {
  server.stop(done)
})

