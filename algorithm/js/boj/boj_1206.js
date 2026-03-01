const fs = require('fs')
const lines = fs.readFileSync('inputs').toString().trim().split('\n')
const n = Number(lines.shift())