var snmp = require('../snmp-v1')

var oids = {
  "1.3.6.1.2.1.1.5.0": "sysName",
  "1.3.6.1.4.1.41112.1.3.2.1.26.1": "radioLinkState",
  "1.3.6.1.4.1.41112.1.3.2.1.44.1": "linkUpTime",
  "1.3.6.1.4.1.41112.1.3.2.1.5.1": "rxCapacity",
  "1.3.6.1.4.1.41112.1.3.2.1.6.1": "txCapacity",
  "1.3.6.1.4.1.41112.1.3.2.1.8.1": "radio0TempC",
  "1.3.6.1.4.1.41112.1.3.2.1.10.1": "radio1TempC",
  "1.3.6.1.4.1.41112.1.3.2.1.11.1": "rxPower0",
  "1.3.6.1.4.1.41112.1.3.2.1.14.1": "rxPower1",
  "1.3.6.1.4.1.41112.1.3.2.1.19.1": "remoteRXPower0",
  "1.3.6.1.4.1.41112.1.3.2.1.22.1": "remoteRXPower1",
  "1.3.6.1.4.1.41112.1.3.2.1.2.1": "curTXModRate",
  "1.3.6.1.4.1.41112.1.3.2.1.18.1": "remoteTXModRate",
  "1.3.6.1.4.1.41112.1.3.2.1.43.1": "ethDataPortInfo",
  "1.3.6.1.4.1.41112.1.3.2.1.4.1": "radioLinkDistM",
  "1.3.6.1.4.1.41112.1.3.2.1.32.1": "gpsAltMeters",
  "1.3.6.1.4.1.41112.1.3.3.1.64.1": "txoctetsAll",
  "1.3.6.1.4.1.41112.1.3.3.1.66.1": "rxoctetsAll"
}

module.exports = function (globalConfig, thing, cb) {
  thing.config.input.oids = oids
  snmp(globalConfig, thing, (err, data) => {
    if (err) return cb(err)
    var values = data.values
    if (values.ethDataPortInfo) {
      values.ethDataPortInfo = parseInt(values.ethDataPortInfo.split('Mbps')[0], 10)
    }
    if (values.gpsAltMeters) {
      values.gpsAltMeters = parseInt(values.gpsAltMeters, 10)
    }
    cb(null, data)
  })
}
