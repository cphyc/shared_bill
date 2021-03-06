module.exports = function(grunt) {

  grunt.initConfig({
    jshint: {
      files: ['Gruntfile.js', 'frontend/**/*.js', 'test/**/*.js'],
      options: {
        globals: {
          jQuery: true,
          angular: true
        }
      }
    },
    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['default']
    },
    concat: {
      unannotated: {
        src: ['frontend/**/*.js', '!frontend/**/*.annotated.js'],
        dest: 'public/javascripts/app.js'
      },
      annotated: {
        src: ['frontend/**/*.annotated.js'],
        dest: 'public/javascripts/app.annotated.js'
      }
    },
    ngAnnotate: {
      options: {
        singleQuotes: true,
      },
      project: {
        files: [{
          expand: true,
          src: ['frontend/**/*.js', '!**/*annotated.js'],
          ext: '.annotated.js',
          extDot: 'last'
        }]
      }
    },
    uglify: {
      project: {
        files: {
          'public/javascripts/app.min.js': ['frontend/**/*.annotated.js']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-ng-annotate');
  grunt.loadNpmTasks('grunt-contrib-uglify');


  grunt.registerTask('default', ['jshint', 'concat:unannotated', 'ngAnnotate', 'uglify']);

};
