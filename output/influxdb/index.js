var request = require('simple-get')

module.exports = function (globalConfig, thing, data, cb) {
  var influxConfig = globalConfig.output.influxdb
  var config = thing.config.output
  var timestamp = data.timestamp * 1000000
  if (!Array.isArray(data)) data = [data]
  expand(config, data)
  var line = data.map(d => toLineProtocol(d, timestamp)).join('\n')
  var url = `${influxConfig.protocol}://${influxConfig.host}:${influxConfig.port}/write?db=${influxConfig.db}`
  request({
    url,
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer(`${influxConfig.username}:${influxConfig.password}`).toString('base64')
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

function expand (config, things, parent) {
  things.forEach(thing => {
    // inherit
    var inherits = config.inherit
    if (inherits) {
      if (!Array.isArray(inherits)) {
        inherits = config.inherit = [inherits]
      }
      inherits.forEach(inheritKey => {
        var value = parent.values[inheritKey]
        if (value !== undefined) {
          thing.values[inheritKey] = value
        }
      })
    }
    // alias
    var alias = config.alias
    for (var key in alias) {
      var aliases = alias[key]
      if (!Array.isArray(aliases)) {
        aliases = config.alias[key] = [aliases]
      }
      var value = thing.values[key]
      if (value !== undefined) {
        aliases.forEach(alias => {
          thing.values[alias] = value
        })
      }
    }
    // tag
    var tags = config.tag
    if (tags) {
      if (!Array.isArray(tags)) {
        tags = config.tag = [tags]
      }
      thing.tags = {}
      tags.forEach(tag => {
        value = thing.values[tag]
        if (value !== undefined) {
          thing.tags[tag] = value
        }
      })
    }
    // nest
    for (var key in config.nested) {
      var subConfig = config.nested[key]
      var subThings = thing.values[key]
      delete thing.values[key]
      if (subThings) {
        subThings = subThings.map(subThing => {
          subThing = {
            key,
            values: subThing
          }
          things.push(subThing)
          return subThing
        })
        expand(subConfig, subThings, thing)
      }
    }
  })
}

function toLineProtocol (data, timestamp) {
  var line = ''
  line += data.key
  if (data.tags) {
    line += ','
    line += toKvString(data.tags)
  }
  line += ' '
  line += toKvString(data.values, true)
  line += ' ' + timestamp
  return line
}

function toKvString (object, quoteStrings) {
  return Object.keys(object).map(key => {
    var value = object[key]
    if (typeof value === 'string') {
      if (quoteStrings) {
        value = `"${value.replace(/"/g, '\\"')}"`
      } else {
        value = escapeSpecial(value)
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
