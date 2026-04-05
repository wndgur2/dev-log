let fs = require('fs');
let [[N, M], ...comparisons] = fs.readFileSync('/dev/stdin').toString().trim().split('\n').map(line=>line.split(' ').map(Number))
// let [[N, M], ...comparisons] = fs.readFileSync('inputs').toString().trim().split('\n').map(line=>line.split(' ').map(Number))
comparisons = comparisons.map(c=>c.map(n=>n-1))

// 양방향 그래프. count 시 중복 방지 처리 필요

const nodes = Array(N).fill(0).map(v=>({children:[], parents:[]}))

for(let i=0; i<M; i++){
  const [big, small] = comparisons[i]
  nodes[big].children.push(small)
  nodes[small].parents.push(big)
}

let answer = 0
const mid = Number.parseInt((N+1)/2)
for(let i=0; i<N; i++){
  const childrens = count(i, false, new Set())-1
  const parents = count(i, true, new Set())-1

  // console.log(i+1, childrens, parents)

  if(childrens >= mid) answer++
  else if(parents >= N-mid+1) answer++
}

console.log(answer)

function count(index, upward, visited){
  if(visited.has(index)) return 0
  visited.add(index)

  const {parents, children} = nodes[index]
  let res = 1
  if(upward){
    for(let p of parents){
      res += count(p, true, visited)
    }
  } else{
    for(let c of children){
      res += count(c, false, visited)
    }
  }

  return res
}