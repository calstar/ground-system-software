//const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const rl = require('readline');
const chalk = require('chalk');
const nmea = require('@drivetech/node-nmea')
const fs = require('fs')

var txLockoutMsgTimeout;

function Rocket(comPort) {
    var SerialPort = require('serialport');
    if (comPort == null){
        SerialPort = require('virtual-serialport');
        comPort = '/dev/ttyUSB0';
    }
    this.state = {
        "fc.pwr": 0,
        "fc.state": 0,
        "fc.alt": 0,
        "tpc.gps": "",
        "transmission": "",
        "comms.recd": 0,
        "comms.sent": 0,
        "gs.rssi": 0,
        "tpc.bat_v": "",
        "tpc.bat_v_avgd": "",
        "tpc.state": "",
        "test.telemetry": "",
        "gs.log": ""
    };
    this.total_comms_recd = 0;
    this.history = {};
    this.listeners = [];
    this.t0 = Date.now();
    this.set_t0 = false;
    this.timestamp0 = 0;
    Object.keys(this.state).forEach(function (k) {
        this.history[k] = [];
    }, this);

    var logFileIndex = 0;
    var logFileName = 'logs/log' + logFileIndex.toString() + '-unconsolidated.tsv';
    while (fs.existsSync('logs/log' + logFileIndex.toString() + '-unconsolidated.tsv')) {
        logFileIndex++;
        logFileName = 'logs/log' + logFileIndex.toString() + '-unconsolidated.tsv';
    }
    const logFile = fs.createWriteStream(logFileName);
    logFile.write("timestamp\tid\tvalue\r\n");
    const lineReader = require('line-reader');
    var VirtualSerialPort = require('virtual-serialport');
    // var sp = new VirtualSerialPort("/dev/ttyUSB0", { baudRate: 115200 });

    //const port = new SerialPort(comPort, { baudRate: 115200 });

    //const parser = port.pipe(new Readline());

    /////////////
    var currId = "";
    var indexNum = 0;
    var schema = "";
    var sp = new VirtualSerialPort("/dev/ttyUSB0", { baudRate: 115200 });
    lineReader.eachLine('./log-output.tsv', function(line) {
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

    // sp.on("dataToDevice", function(data) {
    //   console.log("yoyoyoy");
    //   console.log(data);
    // });
    /////////////
    // var products = '[{  "name": "Pizza",  "price": "10",  "quantity": "7"}, {  "name": "Cerveja",  "price": "12",  "quantity": "5"}, {  "name": "Hamburguer",  "price": "10",  "quantity": "2"}, {  "name": "Fraldas",  "price": "6",  "quantity": "2"}]';
    // var b = JSON.parse(products);
    // console.log(b);
    // console.log(vsPort);
    sp.on("dataToDevice", (line) => {
        try {
            // console.log(line);
            var obj = JSON.parse(line);
            console.log(obj);
            if (obj.id === "gs.log") {
                if (obj.value === "Failed to send frame: Transmit locked.") {
                    if (txLockoutMsgTimeout) {
                        clearTimeout(txLockoutMsgTimeout);
                    }
                    this.writeTxLockoutMsg(false);
                    txLockoutMsgTimeout = setTimeout(this.writeTxLockoutMsg, 5000, true);
                }
            }

            var logTimestamp;
            if (obj.timestamp === -1) {
                obj.timestamp = Date.now();
                logTimestamp = obj.timestamp.toString();
            } else {
                if (this.set_t0 === false) {
                    this.t0 = Date.now();
                    this.timestamp0 = obj["timestamp"];
                    this.set_t0 = true;
                }
                // Zero timestamps to the first received datum
                obj["timestamp"] = obj["timestamp"] - this.timestamp0;
                logTimestamp = obj.timestamp.toString();
                // For display in OpenMCT, add computer's current time
                obj["timestamp"] = this.t0 + Math.round(obj["timestamp"] / 1000);
            }

            if (obj["id"] === "comms.recd") {
                this.total_comms_recd += obj["value"];
                obj["value"] = this.total_comms_recd;
            } else if (obj["id"] === "tpc.gps") {
//                if (obj.value && obj.value !== "") {
 //                   const gps_data = nmea.parse(obj["value"]);
                    //if (gps_data.valid) {
//                        obj.value = data.loc.coordinates.toString();
   //                 }
//                } else {
 //                   return;
  //              }
            }

            this.notify(obj);
            this.history[obj["id"]].push(obj);
            this.updateConsole(obj);

            logFile.write(logTimestamp + "\t" + obj.id.toString() + "\t" + obj.value.toString() + "\r\n");

            // Moving average on battery volage
            if (obj.id === "tpc.bat_v") {
                let last30 = this.history["tpc.bat_v"].length - 30;
                if ( last30 < 0 ) {
                    last30 = 0;
                }
                let last30_len = this.history["tpc.bat_v"].length - last30;
                value = (this.history["tpc.bat_v"].slice(last30).reduce((acc, obj) => acc + obj.value, 0) / last30_len);

                let bat_v_avgd = {
                    "timestamp": obj["timestamp"],
                    "id": "tpc.bat_v_avgd",
                    "value": value
                };

                this.notify(bat_v_avgd)
                this.history["tpc.bat_v_avgd"].push(value);
                this.updateConsole(bat_v_avgd);
                logFile.write(logTimestamp + "\ttpc.bat_v_avgd\t" + value.toString() + "\r\n");
            }
        } catch (e) {
            rl.cursorTo(process.stdout, 0, 40);
            if (e instanceof SyntaxError) {
                console.log("syntax error");
            }
            console.log("error");
            console.log(e.message);
            console.log(line);
        }
    });

    rl.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.on('keypress', (str, key) => {
        // console.log("Str: " + str);
        // console.log("Key: ");
        // console.log(key);
        if (key && ((key.ctrl && key.name == 'c') || key.name == 'q')) {
            // Raw mode so we have to do our own Ctrl-C
            // console.log("Exiting...");
            logFile.end();
            process.exit();
        } else if (key && key.name == 'o') {
            port.write("o\n", function (err) {
                if (err) {
                    return console.log('Error on write: ', err.message)
                }
                // console.log('Turned off FC')
            });
        } else if (key && key.name == 'n') {
            port.write("n\n", function (err) {
                if (err) {
                    return console.log('Error on write: ', err.message)
                }
                // console.log('Turned on FC')
            });
        }
    });

    this.drawTable();
    console.log("Transceiving on port " + comPort);
    console.log("Logging to " + logFileName);

};

var tableRows = {};
var baseLine = 10;
var updateTimeouts = {};
var ageDataTimeout = 3000; // in milliseconds
var tableWidth;
var tableValueCol;
var tableValueMaxLen;
var fcStateDrawInfo;
Rocket.prototype.drawTable = function() {
    // Clear console
    process.stdout.write('\033c');

    rl.cursorTo(process.stdout, 0, baseLine);
    tableWidth =         "-----------------------------------------------------------".length; // same length as below lines
    tableValueCol =      "---------------".length; // length up to start of "Value" table
    tableValueMaxLen =                  "-------------------------------------------".length;
    process.stdout.write("╔═══════════╤═════════════════════════════════════════════╗\r\n");
    process.stdout.write("║           │                                             ║\r\n");
    process.stdout.write("║  ID (*)   │  Value                                      ║\r\n");
    process.stdout.write("║           │                                             ║\r\n");
    process.stdout.write("╠═══════════╪═════════════════════════════════════════════╣\r\n");
    process.stdout.write("║gs.rssi    │                                             ║\r\n"); tableRows["gs.rssi"] = 5;
    process.stdout.write("║           │                                             ║\r\n");
    process.stdout.write("║comms.recd │                                             ║\r\n"); tableRows["comms.recd"] = 7;
    process.stdout.write("║comms.sent │                                             ║\r\n"); tableRows["comms.sent"] = 8;
    process.stdout.write("╟───────────┼─────────────────────────────────────────────║\r\n");
    process.stdout.write("║tpc.state  │                                             ║\r\n"); tableRows["tpc.state"] = 10;
    process.stdout.write("║           │                                             ║\r\n");
    process.stdout.write("║tpc.bat_v  │                                             ║\r\n"); tableRows["tpc.bat_v"] = 12;
    process.stdout.write("║tpc.bat_v *│                                             ║\r\n"); tableRows["tpc.bat_v_avgd"] = 13;
    process.stdout.write("║           │                                             ║\r\n");
    process.stdout.write("║tpc.gps    │                                             ║\r\n"); tableRows["tpc.gps"] = 15;
    process.stdout.write("╟───────────┼─────────────────────────────────────────────║\r\n");
    process.stdout.write("║fc.pwr     │                                             ║\r\n"); tableRows["fc.pwr"] = 17;
    process.stdout.write("║           │                                             ║\r\n");
    process.stdout.write("║fc.state   │                                             ║\r\n"); tableRows["fc.state"] = 19;
    process.stdout.write("║           │                                             ║\r\n");
    process.stdout.write("║fc.alt     │                                             ║\r\n"); tableRows["fc.alt"] = 21;
    process.stdout.write("╚═══════════╧═════════════════════════════════════════════╝\r\n");
    process.stdout.write("\r\nTurn on FC: n\tTurn off FC: o");
    process.stdout.write("                                 ");
    process.stdout.write(chalk.green("Green: Complete") + "   " + chalk.blueBright("Blue: Current") + "\r\n");
    process.stdout.write("Quit: q\r\n");
    tableRows["$END"] = 26;

    // Important: These states should match the states in //firmware-launch/general/msg_fc_update.fbs
    // They must also be in the same order
    // E.g. if msg_fc_update.fbs contains "enum FCState : byte { pad = 0, flight = 1 }"
    // then this should be:
    // fcStateDrawInfo = [
    //     { state: "pad",    line: x },
    //     { state: "flight", line: y }
    // ];
    // where "pad" comes directly before "flight" and x < y
    fcStateDrawInfo = [
        { state: "setup",           line: 1 },
        { state: "pad",             line: 3 },
        { state: "flight",          line: 5 },
        { state: "armed",           line: 7 },
        { state: "drogue_ignited",  line: 10 },
        { state: "drogue_coast",    line: 12 },
        { state: "main_ignited",    line: 15 },
        { state: "main_coast",      line: 17 },
        { state: "landed",          line: 21 }
    ];

    this.drawFCState(undefined);

    // Move back to top left for the "xxx hosted at yyy" messages
    rl.cursorTo(process.stdout, 0, 0);
};
Rocket.prototype.updateConsole = function (obj) {
    if (obj.id === "tpc.gps" && obj.value === "") {
        // We sometimes don't get sent GPS strings. Just ignore it in that case.
        return;
    }

    if (updateTimeouts[obj.id]) {
        clearTimeout(updateTimeouts[obj.id]);
    }

    var value;
    var suffix = "";
    if (obj.id === "comms.recd" || obj.id === "comms.sent") {
        suffix = " bytes";
    } else if (obj.id === "tpc.bat_v") {
        value = obj.value.toFixed(3);
        suffix = " V";
    } else if (obj.id === "tpc.bat_v_avgd") {
        value = obj.value.toFixed(3);
        suffix = " V";
    } else if (obj.id === "fc.alt") {
        value = obj.value.toFixed();
        suffix = " feet";
    }

    if (value === undefined) {
        value = obj.value.toString() + suffix;
    } else {
        value = value.toString() + suffix;
    }

    this.updateRow(obj.id, value, false);
    // Age data
    updateTimeouts[obj.id] = setTimeout(this.updateRow, ageDataTimeout, obj.id, value, true);

    if (obj.id === "fc.state") {
        this.drawFCState(fcStateDrawInfo[obj.value].state);
    }
};
Rocket.prototype.updateRow = function(id, valueStr, aged) {
    valueStr = valueStr.padEnd(tableValueMaxLen);
    if (aged) {
        valueStr = chalk.red.strikethrough(valueStr);
    }

    rl.cursorTo(process.stdout, tableValueCol, baseLine + tableRows[id]);
    process.stdout.write(valueStr);
    rl.cursorTo(process.stdout, 0, baseLine + tableRows["$END"] + 2);
};
Rocket.prototype.drawFCState = function(currentState) {
    var currentStateIndex = -1;
    for (var i = 0; i < fcStateDrawInfo.length; i++) {
        if (currentState === fcStateDrawInfo[i].state) {
            currentStateIndex = i;
            break;
        }
    }

    var completedLineText = chalk.green("|");
    var incompleteLineText = "|";
    for (var i = 0; i < fcStateDrawInfo.length; i++) {
        var stateText = "(X) - " + fcStateDrawInfo[i].state;
        if (i < currentStateIndex) {
            stateText = chalk.green(stateText);
        } else if (i == currentStateIndex) {
            stateText = chalk.blueBright(stateText);
        }

        rl.cursorTo(process.stdout, tableWidth + 5, baseLine + fcStateDrawInfo[i].line);
        process.stdout.write(stateText);

        if (i < fcStateDrawInfo.length - 1) {
            // Draw the line in between
            for (var line = fcStateDrawInfo[i].line + 1; line <= fcStateDrawInfo[i+1].line - 1; line++) {
                rl.cursorTo(process.stdout, tableWidth + 6, baseLine + line);
                // Drawing line between i and i+1
                process.stdout.write(i < currentStateIndex ? completedLineText : incompleteLineText);
            }
        }
    }
};
Rocket.prototype.writeTxLockoutMsg = function(clear) {
    // If clear is false, write it
    // If true, clear it
    rl.cursorTo(process.stdout, 0, baseLine + tableRows["$END"] + 1);
    var text = chalk.redBright(">> Transmit is locked. Press the GS button and try again.");
    if (clear) {
        // text is same length as message
        text = "                                                         "
    }
    process.stdout.write(text);
    rl.cursorTo(process.stdout, 0, baseLine + tableRows["$END"] + 2);
}

Rocket.prototype.notify = function (point) {
    this.listeners.forEach(function (l) {
        l(point);
    });
};

Rocket.prototype.listen = function (listener) {
    this.listeners.push(listener);
    return () => {
        this.listeners = this.listeners.filter(function (l) {
            return l !== listener;
        });
    };
};

module.exports = function (comPort) {
    return new Rocket(comPort)
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
