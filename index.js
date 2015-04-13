'use strict';

var fs = require('fs')
var path = require('path')

var gutil = require('gulp-util')
var through = require('through2')
var crypto = require('crypto')

function calcMd5(content, slice) {
  var md5 = crypto.createHash('md5')
  md5.update(content, 'utf8')

  return slice > 0 ? md5.digest('hex').slice(0, slice) : md5.digest('hex')
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

    function calcQuery(dest, uri, query) {
      if (fs.existsSync(dest)) {
        options[uri] = uri + '?' + calcMd5(fs.readFileSync(dest), options.size | 0)
      } else {
        options[uri] = uri + query
      }
    }

    var content = file.contents.toString()

    /*jshint maxparams:4*/

    content = content
    // css and js
    .replace(/(href|src)="(.+\.(?:css|js))(\?[0-9a-f]{32})?"/g,
      function(all, attr, uri, query) {
        // ignores path begin with http(s), and //
        if (/^(https?:)?\/\//.test(uri)) {
          return all
        }

        if (!(uri in options)) {
          calcQuery(path.join(options.root, uri), uri, query)
        }

        return attr + '="' + options[uri] + '"'
      })
    // app files with seajs.use
    .replace(/seajs.use\('((\/[^\/]+)\/app\/[^'\?]+?)(?:\?[0-9a-f]{32})?'\)/g,
      function(all, uri, appname, query) {
        // ignores path begin with http(s), and //
        if (/^(https?:)?\/\//.test(uri)) {
          return all
        }

        if (!(uri in options)) {
          calcQuery(path.join(options.root, appname + '/dist' + uri + (/\.js$/.test(uri) ? '' : '.js')), uri, query)
        }

        return 'seajs.use(\'' + options[uri] + '\')'
      })

    try {
      file.contents = new Buffer(content);
      this.push(file);
    } catch (err) {
      this.emit('error', new gutil.PluginError('dong-crypto', err, {fileName: file.path}));
    }

    cb()
  })
}
