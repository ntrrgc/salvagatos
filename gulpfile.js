var gulp = require('gulp');
var browserify = require('gulp-browserify');
var shell = require('gulp-shell');

var production = false;

gulp.task('default', function () {
  gulp.src('js/app.js')
      .pipe(browserify({
        insertGlobals: true,
        debug: production
      }))
      .pipe(gulp.dest('./build/js'))
      .pipe(shell(['f5chrome']))
  ;
});