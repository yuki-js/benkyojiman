var gulp=require("gulp");
var plumber = require("gulp-plumber");
var sass = require("gulp-sass");
var runSequence = require('run-sequence');
var browser = require("browser-sync").create();
var browserify = require("browserify")
var source = require('vinyl-source-stream');
var buffer = require("vinyl-buffer")
var uglify =require("gulp-uglify")

gulp.task("browserSync", function() {
  browser.init({
    server: {
      baseDir: "./"
    },
    open:true
  });
});


gulp.task('js', function(){
  browserify({
    entries: ['js/index.js']
  })
    /*.transform("babelify",{presets:["es2015"]})
    .transform("browserify-conditionalify",{
     definitions:{
        isNode:false
      }
    })*/
    .bundle()
    .pipe(source('main.js'))
  //.pipe(buffer())
  //.pipe(uglify())
    .pipe(browser.stream())
    .pipe(gulp.dest('dist/'));
});


gulp.task("sass", function() {
  gulp.src("./scss/style.scss")
    .pipe(plumber())
    .pipe(sass())
    .pipe(gulp.dest("./dist"))
    .pipe(browser.stream());
});
gulp.task("watch", function() {
  gulp.watch("scss/*.scss",["sass"]);
  gulp.watch("js/**/*.js",["js"]);
  gulp.watch("index.html");
});
gulp.task("default", function(cb) {
  return runSequence(
    ['sass',"js","browserSync"],
    'watch',
    cb
  );
  
});
