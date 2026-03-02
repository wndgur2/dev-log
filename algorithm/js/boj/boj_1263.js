const fs = require('fs')
const lines = fs.readFileSync('/dev/stdin').toString().trim().split('\n')
// const lines = fs.readFileSync('inputs').toString().trim().split('\n')
const n = Number(lines.shift())
const ts = lines.map(v=>v.split(' ').map(Number))

ts.sort((a, b)=>b[1]-a[1])

let t = ts[0][1]
let i = 0
while(t>=0 && i<ts.length){
  const [ttl, nt] = ts[i++]
  if(t>nt) t=nt
  t -= ttl
}

console.log(t>=0?t:-1)