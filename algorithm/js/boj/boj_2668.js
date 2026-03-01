const fs = require('fs')
const lines = fs.readFileSync('/dev/stdin').toString().trim().split('\n').map(Number)
// const lines = fs.readFileSync('inputs').toString().trim().split('\n').map(Number)
const n = lines.shift()
const nums = lines.map(v=>v-1)

let count = 0
let picks = []
let topSet, botSet

for(let i=0; i<n; i++){
  topSet = new Set()
  botSet = new Set()
  // console.log('restart from', i)
  if(pickable(i)){
    count++
    picks.push(i+1)
  }
}

console.log(count)
console.log(picks.join('\n'))

function pickable(index){
  // console.log(index)
  topSet.add(index)
  botSet.add(nums[index])
  if(!topSet.has(nums[index]))
    return pickable(nums[index])
  return eqSet(topSet, botSet)
}

function eqSet (xs, ys) {
  return xs.size === ys.size && [...xs].every((x) => ys.has(x));
}
