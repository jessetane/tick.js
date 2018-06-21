var snmp = require('net-snmp')
var Queue = require('queue')

var bgpPeerState = {
  1: 'idle',
  2: 'connect',
  3: 'active',
  4: 'opensent',
  5: 'openconfirm',
  6: 'established'
}

var hrStorageType = {
  1: 'hrStorageOther',
  2: 'hrStorageRam',
  3: 'hrStorageVirtualMemory',
  4: 'hrStorageFixedDisk'
}

var parsers = {
  '4': function (buf) {
    return buf.toString()
  },
  '70': function (buf) {
    // snmp v1 doesn't actually support Counter64?
    var padded = null
    if (buf.length < 8) {
      padded = Buffer.alloc(8)
      buf.copy(padded, 8 - buf.length)
    } else {
      padded = buf
    }
    return padded.readUInt32BE(4)
  },
  macAddress: function (buf) {
    return Array.from(buf).map(b => b.toString(16)).join(':')
  },
  bgpPeerState: function (i) {
    return bgpPeerState[i]
  },
  hrStorageType: function (oid) {
    return hrStorageType[oid.split('1.3.6.1.2.1.25.2.1.')[1]]
  }
}

function parseDefinition (definition, oid) {
  if (typeof definition === 'string') {
    definition = { oid, name: definition }
  } else {
    definition.oid = oid
  }
  return definition
}

function parseVarbind (varbind, definition) {
  var parser = parsers[definition.parser || varbind.type]
  return parser
    ? parser(varbind.value)
    : varbind.value
}

module.exports = function (globalConfig, thing, cb) {
  var snmpConfig = globalConfig.input && globalConfig.input.snmp || {}
  var config = thing.config.input
  if (!thing.session) {
    thing.session = snmp.createSession(thing.key, config.community, {
      timeout: config.timeout || snmpConfig.timeout || 5000
    })
    thing.on('remove', () => thing.session.close())
  }
  var q = new Queue()
  var values = {}
  var bulk = []
  Object.keys(config.oids).forEach(oid => {
    var definition = parseDefinition(config.oids[oid], oid)
    if (definition.table) {
      var tableOid = oid + '.1.'
      var rows = values[definition.name] = { _table_: true }
      Object.keys(definition.table).forEach(subOid => {
        var subDefinition = parseDefinition(definition.table[subOid], subOid)
        subOid = tableOid + subOid
        q.push(cb => {
          thing.session.subtree(subOid, varbinds => {
            varbinds.forEach(varbind => {
              var rowKey = varbind.oid.split(subOid + '.')[1]
              var row = rows[rowKey] = rows[rowKey] || {}
              row[subDefinition.name] = parseVarbind(varbind, subDefinition)
            })
          }, cb)
        })
      })
    } else {
      bulk.push(definition)
    }
  })
  if (bulk.length) {
    q.push(cb => {
      thing.session.get(bulk.map(definition => definition.oid), (err, varbinds) => {
        if (err) return cb(err)
        varbinds.forEach((varbind, i) => {
          var definition = bulk[i]
          values[definition.name] = parseVarbind(varbind, definition)
        })
        cb()
      })
    })
  }
  q.start(err => {
    if (err) return cb(err)
    for (var key in values) {
      var value = values[key]
      if (value._table_) {
        delete value._table_
        var table = []
        for (var subKey in value) {
          var subValue = value[subKey]
          Object.defineProperty(subValue, 'oid', {
            value: subKey,
            enumerable: false
          })
          table.push(subValue)
        }
        values[key] = table
      }
    }
    values.ipAddress = thing.key
    cb(null, {
      key: config.type,
      values
    })
  })
}
