var gulp = require('gulp');
var path = require('path');
var babel = require('gulp-babel');

const excludes = [
   '!dist**',
   '!sapui/**',
   '!node_modules/**'
]

function toDist(file) {
   const distPath = path.join('/dist/', path.dirname(file.history[0]).substring(file.base.length))
   console.log(distPath)
   return distPath
}

gulp.task('watch', function () {
   gulp.watch(excludes.concat(['*.js', 'control/*.js']))
   .on('change', (file) => {
      gulp.src(file.path)
         .pipe(babel())
         .pipe(gulp.dest(file => toDist(file)))
   })
});


gulp.task('build', () => {
   gulp.src(['*/**/*.js', ...excludes])
      .pipe(babel())
      .pipe(gulp.dest(file => toDist(file)))
})

gulp.task('default', ['es6', 'watch']);
