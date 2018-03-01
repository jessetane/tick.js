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
    if (!config || !isObject(config.things) || !isObject(config.outputs)) {
      console.error('invalid configuration')
      return
    }

    // add new timers and things
    var activeIntervals = new Map()
    for (var key in config.things) {
      // validate basic config
      var thingConfig = config.things[key]
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

      // validate input
      if (!thingConfig.input) {
        thingConfig.input = {
          type: config.defaultInput
        }
      } else if (typeof thingConfig.input === 'string') {
        thingConfig.input = {
          type: thingConfig.input
        }
      }
      try {
        var input = require(`./inputs/${thingConfig.input.type}`)
      } catch (err) {
        console.error('unknown input for', thingConfig, err)
        return
      }

      // validate output
      if (!thingConfig.output) {
        thingConfig.output = {
          type: config.defaultOutput
        }
      } else if (typeof thingConfig.output === 'string') {
        thingConfig.output = {
          type: thingConfig.output
        }
      }
      try {
        var output = require(`./outputs/${thingConfig.output.type}`)
      } catch (err) {
        console.error('unknown output for', thingConfig, err)
        return
      }

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

function run () {
  Object.keys(this.things).forEach(key => {
    var thing = this.things[key]
    thing.input(config, thing, (err, data) => {
      if (err) {
        console.error('input failed for', thing, err)
        return
      }
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
