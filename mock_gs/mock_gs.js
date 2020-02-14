const readline = require('readline');
const fs = require('fs');

const readInterface = readline.createInterface({
    input: fs.createReadStream('./log-output.tsv'),
    output: process.stdout,
    console: false
});

readInterface.on('line', function(line) {
    console.log(line);
});
