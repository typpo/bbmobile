var fs = require('fs')
  , path = require('path')
  , exec = require('child_process').exec
  , _ = require('underscore')

var DEFAULT_PREFIX = 'public/js';

function makeBundle(prefix) {
  prefix = prefix || DEFAULT_PREFIX;
  files = fs.readdirSync(path.join(__dirname, prefix));
  var all_src = '';
  var minify = _.filter(files, function(f) {
    return (f.indexOf('.js') == f.length - 3 && f != 'bundle.js');
  }).map(function(f) {
    return path.join(__dirname, prefix, f);
  });

  var closurelib = path.join(__dirname, '../lib/compiler.jar');
  var targets = minify.join(' ');
  var bundlepath = path.join(__dirname, prefix + '/bundle.js');
  var cmd = 'java -jar '
    + closurelib
    + ' --compilation_level SIMPLE_OPTIMIZATIONS --warning_level QUIET'
    + ' ' + targets + ' > ' + bundlepath;
  exec(cmd, function(err, stdout, stderr) {
    if (err) {
      console.log(err, stdout, stderr);
      process.exit();
    }
  });
  //console.info('Writing new minified js bundle..');
  fs.writeFileSync(path.join(__dirname, prefix + '/bundle.js'), all_src);
}

module.exports = {
  makeBundle: makeBundle,
}
