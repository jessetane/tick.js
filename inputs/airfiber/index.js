var snmp = require('../snmp-v1')

module.exports = function (globalConfig, thing, cb) {
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
