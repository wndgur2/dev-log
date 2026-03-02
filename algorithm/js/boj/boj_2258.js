const fs = require('fs')
const lines = fs.readFileSync('/dev/stdin').toString().trim().split('\n')
const [N, M] = lines.shift().split(' ').map(Number)
const ms = lines.map(v=>v.split(' ').map(Number))

ms.sort((a,b)=>a[1]===b[1]?b[0]-a[0]: a[1]-b[1])

let wSum = 0
let sameCostCount=1
let cost = 0
let minCost = 2200000000
for(let i=0; i<N; i++){
  const [w, c] = ms[i]
  wSum += w

  if(c>cost){
    // 가격이 증가하는 일반적인 상황
    sameCostCount=1
    cost = c

    if(wSum >= M){
      if(c<minCost){
        minCost = c
      }
    }
  } else{
    // 같은 가격의 고기 덩어리
    sameCostCount++
    if(wSum >= M){
      const tc = c * sameCostCount
      if(tc<minCost){
        minCost = tc
      }
    }  
  }
}

console.log(minCost<2200000000?minCost:-1)