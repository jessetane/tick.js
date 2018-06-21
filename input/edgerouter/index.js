var snmp = require('../snmp-v1')

var oids = {
  "1.3.6.1.4.1.2021.4.5.0": "memTotalReal",
  "1.3.6.1.4.1.2021.4.6.0": "memAvailReal",
  "1.3.6.1.4.1.2021.4.14.0": "memBuffer",
  "1.3.6.1.4.1.2021.10.1.5.1": "Load-1",
  "1.3.6.1.4.1.2021.10.1.5.2": "Load-5",
  "1.3.6.1.4.1.2021.10.1.5.3": "Load-15",
  "1.3.6.1.2.1.2.2": {
    "name": "interface",
    "table": {
      "2": "ifDescr",
      "5": "ifSpeed",
      "6": {
        "name": "ifPhysAddress",
        "parser": "macAddress"
      },
      "10": "ifInOctets",
      "16": "ifOutOctets"
    }
  },
  "1.3.6.1.2.1.15.3": {
    "name": "peer",
    "table": {
      "1": "remoteId",
      "2": {
        "name": "state",
        "parser": "bgpPeerState"
      },
      "7": "remoteAddress",
      "9": "remoteAs"
    }
  },
  "1.3.6.1.2.1.15.6": {
    "name": "route",
    "table": {
      "13": "bgp4PathAttrBest"
    }
  },
  "1.3.6.1.2.1.25.3.3": {
    "name": "cpu",
    "table": {
      "2": "hrProcessorLoad"
    }
  },
  "1.3.6.1.2.1.25.2.3": {
    "name": "storage",
    "table": {
      "2": {
        "name": "hrStorageType",
        "parser": "hrStorageType"
      },
      "3": "hrStorageDescr",
      "5": "hrStorageSize",
      "6": "hrStorageUsed"
    }
  }
}

module.exports = function (globalConfig, thing, cb) {
  thing.config.input.oids = oids
  snmp(globalConfig, thing, (err, data) => {
    if (err) return cb(err)
    var values = data.values
    values.cpu.forEach((cpu, i) => cpu.index = i)
    values.route = values.route.map(route => {
      var parts = route.oid.split('.')
      var half = Math.floor(parts.length / 2)
      var size = parts.splice(half, 1)
      var destination = parts.slice(0, half).join('.')
      var nexthop = parts.slice(half).join('.')
      var peer = values.peer.find(peer => peer.remoteAddress === nexthop)
      if (peer) {
        peer.prefixCount = peer.prefixCount || 0
        peer.prefixCount++
      }
      return {
        nexthop,
        destination: `${destination}/${size}`,
        selected: route.bgp4PathAttrBest === 2
      }
    })
    cb(null, data)
  })
}
