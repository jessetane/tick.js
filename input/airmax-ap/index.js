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
  "1.3.6.1.4.1.41112.1.4.1": {
    "name": "airmax-radio",
    "table": {
      "4": "ubntRadioFreq",
      "6": "ubntRadioTxPower"
    }
  },
  "1.3.6.1.4.1.41112.1.4.5": {
    "name": "airmax-wlan",
    "table": {
      "2": "ubntWlStatSsid",
      "5": "ubntWlStatSignal",
      "7": "ubntWlStatCcq",
      "8": "ubntWlStatNoiseFloor",
      "14": "ubntWlStatChanWidth",
      "15": "ubntWlStatStaCount"
    }
  },
  "1.3.6.1.4.1.41112.1.4.7": {
    "name": "airmax-station",
    "table": {
      "1": {
        "name": "ubntStaMac",
        "parser": "macAddress"
      },
      "2": "ubntStaName",
      "3": "ubntStaSignal",
      "4": "ubntStaNoiseFloor",
      "5": "ubntStaDistance",
      "6": "ubntStaCcq",
      "11": "ubntStaTxRate",
      "12": "ubntStaRxRate",
      "13": "ubntStaTxBytes",
      "14": "ubntStaRxBytes",
      "16": "ubntStaLocalCINR",
      "17": "ubntStaTxCapacity",
      "18": "ubntStaRxCapacity",
      "19": "ubntStaRxAirtime",
      "20": "ubntStaTxAirtime"
    }
  }
}

module.exports = function (globalConfig, thing, cb) {
  thing.config.input.oids = oids
  snmp(globalConfig, thing, (err, data) => {
    if (err) return cb(err)
    var values = data.values
    var wlan = Object.assign(values['airmax-wlan'][0], values['airmax-radio'][0])
    delete values['airmax-radio']
    var stations = values['airmax-station']
    if (stations) {
      stations.forEach(sta => sta.ubntWlStatSsid = wlan.ubntWlStatSsid)
    }
    cb(null, data)
  })
}
