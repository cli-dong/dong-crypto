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

    var content = file.contents.toString()

    content = content.replace(/((?:href|src)=")(.+\.(?:css|js))(\?(@VERSION|[0-9a-f]+)")/g, function($0, $1, $2) {
      if (!($2 in options)) {
        options[$2] = $2 + '?' + calcMd5(fs.readFileSync(path.join(options.root, $2)), options.size | 0)
      }

      return $1 + options[$2] + '"'
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
