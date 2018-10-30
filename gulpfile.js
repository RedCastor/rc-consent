// ## Globals
var concat       = require('gulp-concat');
var gulp         = require('gulp');
var rename       = require('gulp-rename');
var runSequence  = require('run-sequence');
var jshint       = require('gulp-jshint');
var sourcemaps   = require('gulp-sourcemaps');
var uglify       = require('gulp-uglify');


var path = {
    src: 'src/**/*.js',
    dist: 'dist'
};


// ### JSHint
// `gulp jshint` - Lints configuration JSON and project JS.
gulp.task('jshint', function() {
    return gulp.src([
        'bower.json', 'gulpfile.js'
    ].concat(path.src))
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(jshint.reporter('fail'));
});

// ### Clean
// `gulp clean` - Deletes the build folder entirely.
gulp.task('clean', require('del').bind(null, [path.dist]));

// ### JS processing pipeline minify
// `gulp scripts` - Runs JSHint then compiles, combines, and optimizes Bower JS
// and project JS.
gulp.task('scripts-minify', ['jshint'], function() {

    return gulp.src(path.src)
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(path.dist));
});

// ### JS processing pipeline
// `gulp scripts` - Runs JSHint then compiles, combines, and optimizes Bower JS
// and project JS.
gulp.task('scripts', ['jshint'], function() {

    // the same options as described above
    var options = {
        mangle: false,
        compress: false,
        output: { beautify: true }
    };

    return gulp.src(path.src)
        .pipe(sourcemaps.init())
        .pipe(uglify(options))
        .pipe(sourcemaps.write('.', { sourceRoot: path.dist }))
        .pipe(gulp.dest(path.dist));
});

// ### Build
// `gulp build` - Run all the build tasks but don't clean up beforehand.
// Generally you should be running `gulp` instead of `gulp build`.
gulp.task('build', function(callback) {
    runSequence(
        'scripts',
        'scripts-minify',
        callback);
});

// ### Gulp
// `gulp` - Run a complete build. To compile for production run `gulp --production`.
gulp.task('default', ['clean'], function() {
    gulp.start('build');
});