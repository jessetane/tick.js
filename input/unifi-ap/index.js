var snmp = require('../snmp-v1')

var oids = {
  "1.3.6.1.2.1.1.5.0": "sysName",
  "1.3.6.1.4.1.10002.1.1.1.1.1.0": "memTotal",
  "1.3.6.1.4.1.10002.1.1.1.1.2.0": "memFree",
  "1.3.6.1.4.1.10002.1.1.1.1.3.0": "memBuffer",
  "1.3.6.1.4.1.10002.1.1.1.4.2.1.3.1": "loadValue1",
  "1.3.6.1.4.1.10002.1.1.1.4.2.1.3.2": "loadValue5",
  "1.3.6.1.4.1.10002.1.1.1.4.2.1.3.3": "loadValue10",
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
  "1.3.6.1.4.1.41112.1.6.1.1": {
    "name": "unifi-radio",
    "table": {
      "2": "unifiRadioName",
      "3": "unifiRadioRadio",
      "6": "unifiRadioCuTotal",
      "7": "unifiRadioCuSelfRx",
      "8": "unifiRadioCuSelfTx",
      "9": "unifiRadioOtherBss"
    }
  },
  "1.3.6.1.4.1.41112.1.6.1.2": {
    "name": "unifi-wlan",
    "table": {
      "3": "unifiVapCcq",
      "4": "unifiVapChannel",
      "6": "unifiVapEssId",
      "8": "unifiVapNumStations",
      "9": "unifiVapRadio",
      "10": "unifiVapRxBytes",
      "16": "unifiVapTxBytes",
      "21": "unifiVapTxPower"
    }
  }
}

module.exports = function (globalConfig, thing, cb) {
  thing.config.input.oids = oids
  snmp(globalConfig, thing, (err, data) => {
    if (err) return cb(err)
    // var values = data.values
    cb(null, data)
  })
}
