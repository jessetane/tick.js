var MikroApi = require('mikroapi')

module.exports = function (globalConfig, thing, cb) {
  var config = thing.config.input
  var routerosConfig = globalConfig.inputs
    && globalConfig.inputs.routeros
    && globalConfig.inputs.routeros || {}
  var client = thing.client
  if (!client) {
    client = thing.client = new MikroApi({
      host: config.ipAddress,
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
    client.exec('/routing/bgp/peer/print', {
      '.proplist': 'state,remote-as,remote-id,remote-address,prefix-count'
    }, (err, res) => {
      if (err) return cb(err)
      cb(null, res.filter(peer => peer.state === 'established').map(peer => {
        var remoteAs = peer['remote-as']
        var remoteId = peer['remote-id']
        var prefixCount = parseInt(peer['prefix-count'], 10)
        if (isNaN(prefixCount)) {
          prefixCount = 0
        }
        return {
          key: 'bgp-peer',
          tags: {
            remoteAs,
            remoteId
          },
          values: {
            remoteAs,
            remoteId,
            prefixCount
          }
        }
      }))
    })
  })
}
