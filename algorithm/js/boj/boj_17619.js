// N 10만, Q 10만
// 유니온파인드

const fs = require('fs')

function solve(){
  const lines = fs.readFileSync('/dev/stdin').toString().trim().split('\n')
  const [n, q] = lines[0].split(' ').map(Number)

  const bars = []
  for(let i=1; i<=n; i++){
    const [x1, x2, y] = lines[i].split(' ').map(Number)
    bars.push({id:i-1, x1, x2})
  }
  bars.sort((a,b)=>a.x1-b.x1)

  const parents = Array(n).fill(0).map((v,i)=>i)

  let maxX = bars[0].x2
  
  for(let i=1; i<n; i++){
    const bar = bars[i]
    if(bar.x1 <= maxX){
      union(bars[i-1].id, bar.id)
      if(bar.x2>maxX) maxX = bar.x2
    } else
      maxX = bar.x2
  }

  const ans = []
  for(let i=n+1; i<n+1+q; i++){
    const [a, b] = lines[i].split(' ').map(v=>Number(v)-1)
    const pa = find(a)
    const pb = find(b)
    if(pa===pb) ans.push(1)
    else ans.push(0)
  }

  console.log(ans.join('\n'))

  function find(a){
    if(parents[a]===a) return a
    parents[a] = find(parents[a])
    return parents[a]
  }

  function union(a, b){
    const pa = find(a)
    const pb = find(b)
    if(pa === pb) return false
    parents[pb] = pa
  }
}

solve()