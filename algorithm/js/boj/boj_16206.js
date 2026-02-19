const fs = require('fs')
const lines = fs.readFileSync('/dev/stdin').toString().trim().split('\n')

let [n, k] = lines[0].split(' ').map(Number)
const buns = lines[1].split(' ').map(Number)
buns.sort((a,b)=>{
  if(a%10==0 && b%10==0)
    return a-b
  else if(a%10==0)
    return -1
  else if(b%10==0)
    return 1
  else
    return a-b
})

let ans = 0

for(let i=0; i<n; i++){
  while(buns[i]>=10){
    if(buns[i]==10){
      ans++
      break
    }

    if(k<=0) break

    buns[i]-=10
    ans ++
    k --
  }
}

console.log(ans)