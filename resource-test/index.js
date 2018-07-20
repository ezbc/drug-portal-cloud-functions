const unzipper = require("unzipper");
const JSONStream = require("JSONStream");
const fs = require('fs');

function memoryCallback() {
    // evaluate memory used
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`The script uses approximately ${Math.round(used * 100) / 100} MB`);
}


fs.createReadStream('./drug-event-0028-of-0028.json.zip')
.pipe(unzipper.ParseOne())
.pipe(JSONStream.parse('results.*')) // separate records from the 'results' array
//.pipe(fs.createWriteStream('./drug-event-0028-of-0028.json'))
.on('data', function(data) {})
.on('end', function(){
    memoryCallback()
    console.log('stream finished')
})
.on('finish', function(){
    memoryCallback()
    console.log('stream finished')
}); 
