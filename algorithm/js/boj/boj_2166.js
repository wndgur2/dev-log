let fs = require('fs');
let lines = fs.readFileSync('/dev/stdin').toString().trim().split('\n');
// let lines = fs.readFileSync('inputs').toString().trim().split('\n');
const n = Number(lines.shift())
const coords = lines.map(v=>v.split(' ').map(Number))
coords.push(coords[0])

const BOTTOM = -100_000

let res = 0
let y=coords[0][0], x=coords[0][1]
for(let i=1; i<n+1; i++){
  const [ny, nx] = coords[i]
  let flag = 1
  if(nx>x) flag = -1
  const width = Math.abs(nx-x)
  const height = Math.abs((ny+y)/2 - BOTTOM)
  const area = Math.abs(height * width)
  res += flag*area
  y = ny
  x = nx
}

console.log(Math.abs(res).toFixed(1))