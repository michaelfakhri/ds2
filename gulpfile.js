'use strict'
const gulp = require('gulp')
const eslint = require('gulp-eslint')

require('aegir/gulp')(gulp)

gulp.task('lint-n-fix-src', () => {
  return gulp.src('src/*.js')
        .pipe(eslint({fix: true}))
  .pipe(eslint.format())
  // if fixed, write the file to dest
  .pipe(gulp.dest('src'))
  // .pipe(eslint.failAfterError());
})
