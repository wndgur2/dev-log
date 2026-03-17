let fs = require('fs')
let answers = fs.readFileSync('/dev/stdin').toString().trim().split(' ').map(Number);
// let answers = fs.readFileSync('inputs').toString().trim().split(' ').map(Number);

// dfs 5^10

let res = 0

function dfs(index, score, prev=0, prevDeep=0){
  if(index===10) {
    if(score>=5) res++
    return
  }

  for(let na=1; na<=5; na++){
    if(na==prev && na==prevDeep) continue
    const ns = answers[index]==na?score+1:score
    dfs(index+1, ns, na, prev)
  }
}

dfs(0, 0)

console.log(res)