var fs = require('fs')
var Emitter = require('events')

var config = null
var things = {}
var intervals = new Map()
var init = true

process.on('SIGHUP', reload)

reload()

// keepalive
setInterval(() => {}, 1000 * 60 * 60 * 24)

function reload () {
  console.log('reloading')
  fs.readFile(__dirname + '/config.json', (err, data) => {
    if (err) {
      console.error('failed to load configuration', err)
      return
    }

    // parse config
    try {
      config = JSON.parse(data.toString())
    } catch (err) {
      console.error('error parsing configuration', err)
      return
    }
    if (!config || !isObject(config.things)) {
      console.error('invalid configuration')
      return
    }

    // add new timers and things
    var activeIntervals = new Map()
    for (var key in config.things) {
      // validate basic config
      var thingConfig = config.things[key]
      if (typeof thingConfig === 'string') {
        thingConfig = {
          input: thingConfig,
          output: thingConfig
        }
      }
      if (!isObject(thingConfig)) {
        console.error('invalid thing', thingConfig)
        return
      }
      var duration = thingConfig.interval
        ? parseInt(thingConfig.interval, 10)
        : config.defaultInterval
      if (!duration || isNaN(duration)) {
        console.error('invalid interval for', thingConfig)
        return
      }

      // validate input config
      var input = inflateAndValidateConfig(config, thingConfig, 'input')
      if (!input) return

      // validate output config
      var output = inflateAndValidateConfig(config, thingConfig, 'output')
      if (!output) return

      // create/update intervals
      var interval = intervals.get(duration)
      if (!interval) {
        interval = { duration, things: {}}
        interval.timer = setInterval(run.bind(interval), duration)
        intervals.set(duration, interval)
        console.log('timer added for', duration)
      }
      activeIntervals.set(duration, interval)

      // create/update things
      var thing = things[key]
      if (!thing) {
        thing = things[key] = new Emitter()
        thing.key = key
      }
      thing.config = thingConfig
      thing.input = input
      thing.output = output
      interval.things[key] = thing
    }

    // remove stale things
    for (var key in things) {
      if (config.things[key]) {
        thing.emit('reload')
      } else {
        delete things[key]
        thing.emit('remove')
      }
    }

    // remove stale timers
    intervals.forEach((interval, duration) => {
      if (activeIntervals.get(duration)) {
        for (var key in interval.things) {
          if (!things[key]) {
            delete things[key]
          }
        }
      } else {
        clearInterval(interval.timer)
        intervals.delete(duration)
        console.log('timer removed for', duration)
      }
    })

    // run at init
    if (init) {
      init = false
      intervals.forEach(interval => {
        run.call(interval)
      })
    }
  })
}

function inflateAndValidateConfig (config, thingConfig, side) {
  var sideDefault = 'default' + side[0].toUpperCase() + side.slice(1)
  // inflate
  if (typeof thingConfig[side] === 'string') {
    if (config[side] && config[side][thingConfig[side]]) {
      thingConfig[side] = {
        type: thingConfig[side]
      }
    } else if (config[sideDefault]) {
      thingConfig[side] = {
        type: config[sideDefault]
      }
    }
  } else if (isObject(thingConfig[side])) {
    if (typeof thingConfig[side].type !== 'string' && config[sideDefault]) {
      thingConfig[side].type = config[sideDefault]
    }
  } else if (config.defaultOutput) {
    thingConfig[side] = {
      type: config[sideDefault]
    }
  }
  // validate
  if (!isObject(thingConfig[side]) || typeof thingConfig[side].type !== 'string') {
    console.error(`unkown ${side} for`, thingConfig)
    return
  }
  // merge type
  var typeConfig = config[side] && config[side][thingConfig[side].type]
  if (typeConfig) {
    Object.assign(thingConfig[side], typeConfig)
  }
  // require module
  var err = null
  var mod = null
  var sideConfig = thingConfig[side]
  var modName = sideConfig.module || sideConfig.type
  try {
    mod = require(`./${side}/${modName}`)
  } catch (_err) {
    if (_err.code === 'MODULE_NOT_FOUND' && !sideConfig.module && config[sideDefault]) {
      try {
        mod = require(`./${side}/${config[sideDefault]}`)
      } catch (err) {
        err = _err
      }
    } else {
      err = _err
    }
  }
  if (err) {
    console.error(`unknown ${side} for`, thingConfig, err)
  } else {
    return mod
  }
}

function run () {
  Object.keys(this.things).forEach(key => {
    var thing = this.things[key]
    var timestamp = +new Date()
    thing.input(config, thing, (err, data) => {
      if (err) {
        console.error('input failed for', thing, err)
        return
      }
      data.timestamp = timestamp
      thing.output(config, thing, data, err => {
        if (err) {
          console.error('output failed for', thing, err)
        }
      })
    })
  })
}

function isObject (obj) {
  return obj && typeof obj === 'object'
}
