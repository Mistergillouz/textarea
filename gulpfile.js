const gulp = require('gulp');
const path = require('path');
const babel = require('gulp-babel');
const vinyl = require('vinyl-fs');
const map = require('map-stream')
const plumber = require('gulp-plumber')
const replace = require('gulp-replace')

// const excludes = [
//    '!dist/**',
//    '!sapui/**',
//    '!node_modules/**',
//    '!gulp*',
//    '!package.json',
//    '!*.zip'
// ]

// function toDist(file) {
//    const distPath = path.join('dist/', file.dirname.substring(file.cwd.length + 1))
//    return distPath
// }

// function isJavacript(file) {
//    return file.path.endsWith('.js')
// }

// function processFile(file) {
//    const dest = toDist(file)
//    console.log(file.path, dest)
//    if (isJavacript(file)) {
//       gulp.src(file.path)
//          .pipe(plumber())
//          .pipe(babel())
//          .pipe(gulp.dest(dest))
//    } else {
//       gulp.src(file.path)
//          .pipe(gulp.dest(dest))
//    }
// }

// gulp.task('watch', function () {
//    gulp.watch(['**', ...excludes])
//       .on('change', (file) => processFile(file))
// });

// gulp.task('build', () => {
//    const src = vinyl.src(['**', ...excludes], { read: false })
//       .pipe(map((file, cb) => {
//          processFile(file)
//          cb(null)
//       }))
// })

const less = require('gulp-less');


gulp.task('default', ['watch']);

gulp.task('less', function() {
   gulp.src('**/*/*.less')
     .pipe(less())
     .pipe(gulp.dest('.'));
 });


 gulp.task('watch', function() {
   gulp.watch(['**/*/*.less'], ['less'])
 });
