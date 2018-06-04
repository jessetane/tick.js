module.exports = function (globalConfig, thing, data, cb) {
  var format = thing.config.output && thing.config.output.format
  if (!format) {
    format = globalConfig.output
      && globalConfig.output.stdout
      && globalConfig.output.stdout.format
  }
  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2))
    cb()
  } else {
    cb(new Error('unknown format'))
  }
}
