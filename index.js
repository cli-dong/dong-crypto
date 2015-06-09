'use strict';

var fs = require('fs')
var path = require('path')

var gutil = require('gulp-util')
var through = require('through2')
var crypto = require('crypto')

function calcMd5(content) {
  var md5 = crypto.createHash('md5')
  md5.update(content, 'utf8')

  return md5.digest('hex').slice(0, 8)
}

module.exports = function(options) {
  options || (options = {})

  return through.obj(function (file, enc, cb) {
    if (file.isNull()) {
      cb(null, file)
      return
    }

    if (file.isStream()) {
      cb(new gutil.PluginError('dong-crypto', 'Streaming not supported'))
      return
    }

    var resultsQuery = {}
    var resultsNoQuery = {}

    function calcQuery(dest, uri, query) {
      if (fs.existsSync(dest)) {
        resultsQuery[uri] = uri + '?' + calcMd5(fs.readFileSync(dest))
      } else {
        resultsQuery[uri] = uri + query
      }
    }

    function calcNoQuery(dest, uri) {
      var value

      if (options.i18n) {
        value = options.i18n.map(function(lang) {
          var _dest = path.join(options.root, 'dist', lang,  dest)
          return '\'' + lang + '\'' + ': \'' + (fs.existsSync(_dest) ? calcMd5(fs.readFileSync(_dest)) : '') + '\''
        })

        value = ['{', value.join(','), '}'].join('')
      } else {
        dest = path.join(options.root, 'dist', dest)
        value = fs.existsSync(dest) ? calcMd5(fs.readFileSync(dest)) : ''

        value = '\'' + value + '\''
      }

      resultsNoQuery[uri] = '\'' + uri + '\': ' + value
    }

    var content = file.contents.toString()

    /*jshint maxparams:4*/

    content = content
    // lib/config
    .replace(/'(\/[^'\?]*?index(\.js)?)': '(?:[0-9a-f]{8})?'/g,
      function(all, uri) {
        if (!(uri in resultsNoQuery)) {
          calcNoQuery(uri + (/\.js$/.test(uri) ? '' : '.js'), uri)
        }

        return resultsNoQuery[uri]
      })
    // css and js in html
    .replace(/(href|src)="(.+\.(?:css|js))(\?[0-9a-f]{8})?"/g,
      function(all, attr, uri, query) {
        // ignores path begin with http(s), and //
        if (/^(https?:)?\/\//.test(uri)) {
          return all
        }

        if (!(uri in resultsQuery)) {
          calcQuery(path.join(options.root, uri), uri, query)
        }

        return attr + '="' + resultsQuery[uri] + '"'
      })

    try {
      file.contents = new Buffer(content)
      this.push(file)
    } catch (err) {
      this.emit('error', new gutil.PluginError('dong-crypto', err, {fileName: file.path}))
    }

    cb()
  })
}
