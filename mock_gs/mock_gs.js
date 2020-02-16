
// const readline = require('readline');
// const fs = require('fs');
//
// const readInterface = readline.createInterface({
//     input: fs.createReadStream('./log-output.tsv'),
//     output: process.stdout,
//     console: true
// });
//
// readInterface.on('line', function(line) {
//     //console.log();
//     //console.log(line);
// });

const lineReader = require('line-reader');
const VirtualSerialPort = require('virtual-serialport');

exports.simulate_gs = function(filepath) {
  var currId = "";
  var indexNum = 0;
  var sp = new VirtualSerialPort("/dev/ttyUSB0", { baudRate: 115200 });
  lineReader.eachLine(filepath, function(line) {
      var id = line.substring(0, line.indexOf("\t"));
      if (currId !== id) {
        indexNum += 1;
        currId = id;
      }
      setTimeout(() => { console.log(line); }, indexNum * 1000);
  });
};
