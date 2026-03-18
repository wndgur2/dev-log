let fs = require('fs');
let lines = fs.readFileSync('/dev/stdin').toString().trim().split('\n');
// let lines = fs.readFileSync('inputs').toString().trim().split('\n');

// graph

const N = Number(lines[0])
const M = Number(lines[N+1])

const premises = lines.slice(1, N+1).map(str=>str.split(' is '))
const queries = lines.slice(N+2, N+2+M).map(str=>str.split(' is '))

const nextNodes = new Map()

for(let i=0; i<N; i++){
  // premises -> map
  const [c, p] = premises[i]
  nextNodes.set(c, p)
}

const res = []

for(let i=0; i<M; i++){
  const [a, b] = queries[i]
  if(find(a, b)) res.push('T')
  else res.push('F')
}

console.log(res.join('\n'))

function find(a, b){
  let c = a

  while(nextNodes.has(c)){
    const n = nextNodes.get(c)
    if(n == b) return true
    else c = n
  }

  return false
}