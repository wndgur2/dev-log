let fs = require('fs');
let [[N, M], ...lines] = fs.readFileSync('/dev/stdin').toString().trim().split('\n').map(l=>l.split(' ').map(Number));
// let [[N, M], ...lines] = fs.readFileSync('inputs').toString().trim().split('\n').map(l=>l.split(' ').map(Number));

// 그래프, dfs

class Node{
  incomings = 0
  afters = []
  afterSet = new Set()
  constructor(i){
    this.i = i
  }
} 

// 그래프 형성
const nodes = Array(N).fill(0).map((v,i)=>new Node(i))

for(let li=0; li<M; li++){
  const [a, b] = lines[li].map(v=>v-1)
  nodes[a].afters.push(nodes[b])
  nodes[b].incomings++
}

// dfs,  <= 400 * 400?
const starters = []

for(let i=0; i<N; i++){
  const node = nodes[i]
  if(node.incomings==0){
    starters.push(node)
  }
}

for(let i=0; i<starters.length; i++){
  dfs(starters[i])
}

function dfs(node){
  for(let next of node.afters){
    if(node.afterSet.has(next.i)) continue // visited
    node.afterSet.add(next.i)

    const ns = dfs(next)
    for(let i of ns){
      node.afterSet.add(i)
    }
  }

  return node.afterSet
}

const s = lines[M][0]

const res = []

for(let li=M+1; li<M+1+s; li++){
  const [a, b] = lines[li].map(i=>i-1)

  if(nodes[a].afterSet.has(b)){
    res.push(-1)
  } else if(nodes[b].afterSet.has(a)){
    res.push(1)
  } else{
    res.push(0)
  }
}

console.log(res.join('\n'))