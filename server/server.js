/**
 * Basic implementation of a history and realtime server.
 */

function runServer(comPort) {
    var Rocket = require('./rocket');
    var RealtimeServer = require('./realtime-server');
    var HistoryServer = require('./history-server');
    var StaticServer = require('./static-server');
    
    var expressWs = require('express-ws');
    var app = require('express')();
    expressWs(app);
    
    var rocket = new Rocket(comPort);
    var realtimeServer = new RealtimeServer(rocket);
    var historyServer = new HistoryServer(rocket);
    var staticServer = new StaticServer();
    
    app.use('/realtime', realtimeServer);
    app.use('/history', historyServer);
    app.use('/', staticServer);
    
    var port = process.env.PORT || 8080
    
    app.listen(port, function () {
        console.log('Open MCT hosted at http://localhost:' + port);
        console.log('History hosted at http://localhost:' + port + '/history');
        console.log('Realtime hosted at ws://localhost:' + port + '/realtime');
    });
}

if (process.argv.length < 3) {
    require('serialport').list().then(
        ports => {
            var possiblePorts = [];
            for (var i = 0; i < ports.length; i++) {
                var port = ports[i];
                if (port.serialNumber === '0123456789' && port.vendorId === '1F00') {
                    possiblePorts.push(port);
                }
            }

            if (possiblePorts.length == 1) {
                runServer(possiblePorts[0].comName);
            } else if (possiblePorts.length > 1) {
                console.log("There are multiple possible ground station ports:");
                for (var i = 0; i < possiblePorts.length; i++) {
                    console.log("  - " + possiblePorts[i].comName);
                }
                console.log("Pick one port and re-run with the port as the first argument.");
                process.exit(1);
            } else if (possiblePorts.length == 0) {
                console.log("Could not find any ground station ports.");
                process.exit(1);
            }
        },
        err => {
            console.error(err);
            process.exit(1);
        }
    );
} else {
    runServer(process.argv[2]);
}