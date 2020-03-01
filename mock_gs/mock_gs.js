const lineReader = require('line-reader');
const VirtualSerialPort = require('virtual-serialport');

// exports.simulate_gs = function(filepath) {
//   var currId = "";
//   var indexNum = 0;
//   var sp = new VirtualSerialPort("/dev/ttyUSB0", { baudRate: 115200 });
//   lineReader.eachLine(filepath, function(line) {
//       var id = line.substring(0, line.indexOf("\t"));
//       if (currId !== id) {
//         indexNum += 1;
//         currId = id;
//       }
//       // setTimeout(() => { console.log(line); }, indexNum * 1000);
//       setTimeout(() => { sp.write(line); }, indexNum * 1000);
//   });
//
//   // sp.on("dataToDevice", function(data) {
//   //   console.log(data);
//   // });
// };

exports.simulate_gs = function(filepath) {
  var currId = "";
  var indexNum = 0;
  var schema = "";
  var sp = new VirtualSerialPort("/dev/ttyUSB0", { baudRate: 115200 });
  lineReader.eachLine(filepath, function(line) {
    var cols = line.split('\t');
    if (schema !== "") {
      var id = cols[0];// line.substring(0, line.indexOf("\t"));
      if (currId !== id) {
        indexNum += 1;
        currId = id;
      }
      // setTimeout(() => { console.log(line); }, indexNum * 1000);
      setTimeout(() => { sp.write(schema.format(cols[0], cols[1], cols[2])); }, indexNum * 1000);
    } else {
      schema = cols.reduce((schem, col) => { return schem + " \"" + col + "\": \"{}\"," }, "[{");
      schema = schema.substring(0, schema.length - 1) + "}]";
    }
  });

  sp.on("dataToDevice", function(data) {
    console.log(JSON.parse(data));
  });
};

String.prototype.format = function () {
  var i = 0, args = arguments;
  return this.replace(/{}/g, function () {
    return typeof args[i] != 'undefined' ? args[i++] : '';
  });
};

String.prototype.formatBrac = function () {
  var i = 0, args = arguments;
  return this.replace(/[]/g, function () {
    return typeof args[i] != 'undefined' ? args[i++] : '';
  });
};
