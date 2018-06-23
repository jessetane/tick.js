var MikroApi = require('mikroapi')
var Queue = require('queue')

module.exports = function (globalConfig, thing, cb) {
  var config = thing.config.input
  var client = thing.client
  if (!client) {
    client = thing.client = new MikroApi({
      host: thing.key,
      port: config.port,
      username: config.username,
      password: config.password,
      tls: {
        rejectUnauthorized: false
      }
    })
    thing.on('remove', () => client.close())
  }
  client.connect(err => {
    if (err) return cb(err)
    var router = { ipAddress: thing.key }
    var q = new Queue({ concurrency: 1 })
    q.push(cb => {
      client.exec('/system/resource/print', {
        '.proplist': 'cpu-load,free-memory,total-memory,total-hdd-space,free-hdd-space'
      }, (err, res) => {
        if (err) return cb(err)
        var values = toCamel(res[0])
        for (var key in values) {
          values[key] = parseInt(values[key], 10)
        }
        Object.assign(router, values)
        cb()
      })
    })
    q.push(cb => {
      client.exec('/system/identity/print', {}, (err, res) => {
        if (err) return cb(err)
        router.name = res[0].name
        cb()
      })
    })
    q.push(cb => {
      client.exec('/ip/route/print', {
        '?dst-address': '0.0.0.0/0',
        '.proplist': 'dst-address,gateway,gateway-status,active,bgp-as-path,bgp-communitites,received-from'
      }, (err, res) => {
        if (err) return cb(err)
        router.route = res.map(route => {
          toCamel(route)
          route.gatewayStatus = route.gatewayStatus.split(' ').filter(p => p).join(' ')
          return route
        })
        cb()
      })
    })
    q.push(cb => {
      client.exec('/routing/bgp/peer/print', {
        '.proplist': 'state,remote-as,remote-id,remote-address,prefix-count,name'
      }, (err, res) => {
        if (err) return cb(err)
        router.peer = res.filter(peer => peer.state === 'established').map(peer => {
          var values = toCamel(peer)
          var prefixCount = parseInt(values.prefixCount, 10)
          if (isNaN(prefixCount)) {
            prefixCount = 0
          }
          values.prefixCount = prefixCount
          return values
        })
        cb()
      })
    })
    q.push(cb => {
      client.exec('/interface/ethernet/print', {
        '.proplist': 'name,rx-bytes,tx-bytes,'
      }, (err, res) => {
        if (err) return cb(err)
        router.interface = res.map(iface => {
          toCamel(iface)
          iface.rxBytes = parseInt(iface.rxBytes, 10)
          iface.txBytes = parseInt(iface.txBytes, 10)
          return iface
        })
        cb()
      })
    })
    q.start(err => {
      if (err) return cb(err)
      cb(null, {
        key: config.type,
        values: router
      })
    })
  })
}

function toCamel (values) {
  for (var key in values) {
    var camel = key.split('-').map((p, i) => {
      if (i > 0) p = p[0].toUpperCase() + p.slice(1)
      return p
    }).join('')
    if (camel !== key) {
      values[camel] = values[key]
      delete values[key]
    }
  }
  return values
}
