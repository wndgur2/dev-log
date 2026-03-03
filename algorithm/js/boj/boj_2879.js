const fs = require('fs')
const lines = fs.readFileSync("/dev/stdin").toString().trim().split('\n')
// const lines = fs.readFileSync("inputs").toString().trim().split('\n')
const N = Number(lines[0])
const cis = lines[1].split(' ').map(Number)
const is = lines[2].split(' ').map(Number)

for(let i=0; i<N; i++){
  is[i] -= cis[i]
}

let res = 0

for(let i=0; i<N; ){
  // start from i
  let mvi = i
  let mv = is[i]

  for(let j=i+1; j<N; j++){
    // where to end
    if(is[j] * is[i] > 0) {
      mvi = j
      if(Math.abs(is[j]) < Math.abs(mv))
        mv = is[j]
    }
  }

  // i~mvi까지 mv만큼 indent
  res += Math.abs(mv)
  for(let j=i; j<mvi+1; j++){
    is[j] = is[j] - mv
  }

  if(is[i]==0) i++
}

console.log(res)