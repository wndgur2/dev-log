let fs = require('fs')
let lines = fs.readFileSync('/dev/stdin').toString().trim().split('\n').map(Number);
// let lines = fs.readFileSync('inputs').toString().trim().split('\n').map(Number);
const G = lines.shift()
const P = lines.shift()
const planes = lines

const parents = Array(G+1).fill(0)

for(let i=0; i<G+1; i++){
  parents[i] = i
}

let res = 0
for(let i=0; i<P; i++){
  let gp = planes[i]
  let root = findParent(gp)
  if(root==0) break
  res++
  parents[root] = findParent(root-1)
}
console.log(res)

function findParent(g){
  if(parents[g]==g) return g
  return (parents[g] = findParent(parents[g]))
}








// planes.sort((a, b)=>b-a)

// let gates = Array(G+1).fill(false)
// let lastG = G+1
// let res = 0
// for(let i=0; i<P; i++){
//   if(lastG==1) break

//   const gp = planes[i]
//   if(gp<lastG){
//     gates[gp] = true
//     lastG = gp
//   } else{
//     gates[lastG-1] = true
//     lastG --
//   }
//   res++
// }

// console.log(res)