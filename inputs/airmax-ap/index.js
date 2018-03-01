var snmp = require('../snmp-v1')

module.exports = function (globalConfig, thing, cb) {
  snmp(globalConfig, thing, (err, data) => {
    if (err) return cb(err)
    var tmp = [data]
    var values = data.values
    var stations = values.stations
    delete values.stations
    for (var key in stations) {
      var station = stations[key]
      station.accessPoint = data.key
      var output = {
        key: 'airmax-station',
        values: station,
        tags: {
          accessPoint: station.accessPoint
        }
      }
      var stationMac = station.ubntStaMac
      if (stationMac) {
        output.tags.mac = stationMac
      }
      var stationName = station.ubntStaName
      if (stationName) {
        output.tags.name = stationName
      }
      tmp.push(output)
    }
    cb(null, tmp)
  })
}
