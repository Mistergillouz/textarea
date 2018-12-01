var gulp = require('gulp');
var path = require('path');
var babel = require('gulp-babel');

const excludes = [
   '!dist/**',
   '!sapui/**',
   '!node_modules/**'
]

function toDist(file) {
   const distPath = path.join('dist/', file.base.substring(file.cwd.length + 1))
   console.log(distPath)
   return distPath
}

gulp.task('watch', function () {
   gulp.watch(['*.js', 'control/*.js', ...excludes])
   .on('change', (file) => {
      gulp.src(file.path)
         .pipe(babel())
         .pipe(gulp.dest(file => toDist(file)))
   })
});


gulp.task('build', () => {
   gulp.src(['*/**/*.js', '*.js', ...excludes])
      .pipe(babel())
      .pipe(gulp.dest('./dist'))
   
   gulp.src(['*.html', '*/**/*.css', '*.xml', , ...excludes])
      .pipe(gulp.dest('./dist'));
})

gulp.task('default', ['es6', 'watch']);
