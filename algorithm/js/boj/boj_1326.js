let fs = require('fs');
let lines = fs.readFileSync('/dev/stdin').toString().trim().split('\n');
// let lines = fs.readFileSync('inputs').toString().trim().split('\n');
const n = Number(lines[0])
const numbers = lines[1].split(' ').map(Number)
const [a, b] = lines[2].split(' ').map(v=>Number(v)-1)

const visited = Array(n).fill(false)
const q = [[a, 0]]
let qi = 0

let res = -1

while(qi<q.length){
  const [i, count] = q[qi++]
  const hop = numbers[i]
  if (Math.abs(b - i) % hop == 0){
    res = count+1
    break
  }
  const si = i-(Math.floor(i/hop)*hop)
  for(let j=si; j<n+1; j+=hop){
    if(visited[j]) continue
    q.push([j, count+1])
    visited[j] = true
  }
}

console.log(res)