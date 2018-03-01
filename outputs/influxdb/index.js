var request = require('simple-get')

module.exports = function (globalConfig, thing, data, cb) {
  var config = globalConfig.outputs.influxdb
  var line = null
  if (Array.isArray(data)) {
    line = data.map(d => toLineProtocol(d)).join('\n')
  } else {
    line = toLineProtocol(data)
  }
  var url = `${config.protocol}://${config.host}:${config.port}/write?db=${config.db}`
  request({
    url,
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer(`${config.username}:${config.password}`).toString('base64')
    },
    body: line
  }, (err, res, body) => {
    if (err) {
      console.error('influxdb output failed', err, body && body.toString())
      cb(err)
      return
    }
    cb()
  })
}

function toLineProtocol (data) {
  var line = ''
  line += data.key
  if (data.tags) {
    line += ','
    line += toKvString(data.tags)
  }
  line += ' '
  line += toKvString(data.values, true)
  return line
}

function toKvString (object, quoteStrings) {
  return Object.keys(object).map(key => {
    var value = object[key]
    if (typeof value === 'string') {
      value = escapeSpecial(value)
      if (quoteStrings) {
        value = `"${value}"`
      }
    }
    return `${key}=${value}`
  }).join(',')
}

function escapeSpecial (string) {
  return string.replace(/,/g, '\\,')
    .replace(/=/g, '\\=')
    .replace(/ /g, '\\ ')
    .replace(/"/g, '\\"')
}
