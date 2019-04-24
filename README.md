# Ground System Software
 
 Commandline and in-browser ground system software for telemetry and telecommand.

 For more complete information on how to install and use ground system software, view the gitbooks.

## Basics of running ground system software

Plug in the ground station and run `npm start`. You should be given options for available
ports. Select which one the ground station is on. If not, determine which port the 
ground station is on and then pass it as the third argument (eg `npm start /dev/ttyS13`).

You will then be shown a commandline interface with current data. Follow the instructions
on screen for sending commands. For telemetry visualization, open up the browser
and go to 'http://localhost:8080'.

## Basic information for modifying this program.

Much of the code is in `server/rocket.js`.

Use `log-consolidate.py` to process the latest log in `logs` to have a single row
for each timestamp.

Set the layouts OpenMCT displays in `index.html`, as described there.

Change the telemetry values OpenMCT receives by modifying `dictionary.json`.