#! /usr/bin/env node

'use strict';


const Fs = require('fs');
const Path = require('path');
const Gm = require('gm');
const Async = require('async');
const Minimist = require('minimist');
const Pkg = require('../package.json');


const internals = {
  batchCount: 0
};


internals.help = () => console.log([
  '',
  'Usage: create-gif [<options>] <src-dir> <dest-dir>',
  '',
  'Options:',
  '',
  '-m, --max      Max images per batch/gif. Default 100.',
  '-d, --delay    In hundreths of a second. Default: 5.',
  '-w, --width    Resize to width maintaining aspect ratio. Default: 600.',
  '-y, --height   Resize to height maintaining aspect ratio. Default: 600.',
  '-h, --help     Show this help.',
  '-v, --version  Show version.',
  ''
].join('\n'));


internals.createGif = (options, files, cb) => {
  const dest = Path.join(options.dest, (internals.batchCount++) + '.gif');

  if (options.noop) {
    return cb(null, dest);
  }

  const gif = Gm();

  for (let i = 0; i < files.length; i++) {
    gif.in(Path.join(options.src, files[i]));
  }

  gif
    .delay(options.delay)
    .resize(options.width, options.height)
    .stream('gif')
    .pipe(Fs.createWriteStream(dest))
    .on('close', err => cb(err, dest));
};


internals.ensureDir = path => {
  if (!Fs.existsSync(path) || !Fs.lstatSync(path).isDirectory()) {
    console.error(path + ' is not a directory!');
    process.exit(1);
  }
};


internals.main = options => {
  if (options.h || options.help) {
    return internals.help();
  }
  else if (options.v || options.version) {
    return console.log(Pkg.version);
  }

  options.delay = options.d || options.delay || 5;
  options.width = options.w || options.width || 600;
  options.height = options.y || options.height || 600;
  options.max = options.m || options.max || 100;
  options.src = Path.resolve(options._.shift() || '.');
  options.dest = Path.resolve(options._.shift() || '.');

  internals.ensureDir(options.src);
  internals.ensureDir(options.dest);

  console.log('Leyendo imágenes de ' + options.src);
  Fs.readdir(options.src, (err, data) => {
    if (err) {
      throw err;
    }

    const files = data.filter(fname => /\.jpg$/.test(fname));
    console.log(files.length + ' imágenes en directorio');

    // groupos de `options.max`, por ahora dejamos el restante para el final.
    const batches = Math.floor(files.length / options.max);
    const remainder = files.length % options.max;
    const parts = [];

    for (let i = 0; i < batches; i++) {
      parts.push(files.slice(i * options.max, (i * options.max) + options.max));
    }

    // ahora vemos las restantes
    if (remainder) {
      parts.push(files.slice(batches * options.max, (batches * options.max) + remainder));
    }

    console.log('Se crearán ' + parts.length + ' gifs...');
    Async.mapSeries(parts, Async.apply(internals.createGif, options), (err, results) => {
      if (err) {
        throw err;
      }
      console.log(results.join('\n'));
    });
  });
};


internals.main(Minimist(process.argv.slice(2)));
