var snmp = require('net-snmp')
var Queue = require('queue')

var parsers = {
  '4': function (buf) {
    return buf.toString()
  },
  '70': function (buf) {
    // snmp v1 doesn't actually support Counter64?
    var padded = null
    if (buf.length < 8) {
      padded = new Buffer(8)
      buf.copy(padded, 8 - buf.length)
    } else {
      padded = buf
    }
    return padded.readUInt32BE(4)
  },
  macAddress: function (buf) {
    return Array.from(buf).map(b => b.toString(16)).join(':')
  }
}

module.exports = function (globalConfig, thing, cb) {
  var config = thing.config.input
  var snmpConfig = globalConfig.inputs && globalConfig.inputs.snmp || {}
  if (!thing.session) {
    thing.session = snmp.createSession(config.ipAddress, config.community, {
      timeout: config.timeout || snmpConfig.timeout || 5000
    })
    thing.on('remove', () => thing.session.close())
  }
  var q = new Queue()
  var output = {}
  var bulk = []
  try {
    var oids = snmpConfig.mibs[config.mib]
  } catch (err) {
    cb(err)
    return
  }
  Object.keys(oids).forEach(oid => {
    var property = oids[oid]
    if (property.subtree) {
      q.push(cb => {
        var subtree = output[property.subtree]
        if (!subtree) {
          subtree = output[property.subtree] = {}
        }
        thing.session.subtree(oid, varbind => {
          varbind = varbind[0]
          var subOid = varbind.oid.split(oid)[1]
          var item = subtree[subOid]
          if (!item) {
            item = subtree[subOid] = {}
          }
          item[property.name] = Buffer.isBuffer(varbind.value)
            ? parsers[property.parser || varbind.type](varbind.value)
            : varbind.value
        }, cb)
      })
    } else {
      bulk.push([oid, property])
    }
  })
  if (bulk.length) {
    q.push(cb => {
      thing.session.get(bulk.map(p => p[0]), (err, varbinds) => {
        if (err) {
          cb(err)
          return
        }
        varbinds.forEach((varbind, i) => {
          var property = bulk[i][1]
          output[property.name] = Buffer.isBuffer(varbind.value)
            ? parsers[property.parser || varbind.type](varbind.value)
            : varbind.value
        })
        cb()
      })
    })
  }
  q.start(err => {
    cb(err, {
      key: thing.key,
      values: output
    })
  })
}
