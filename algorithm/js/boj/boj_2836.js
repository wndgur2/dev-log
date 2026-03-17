const fs = require('fs')
const lines = fs.readFileSync('/dev/stdin').toString().trim().split('\n').map(v=>v.split(' ').map(Number))
// const lines = fs.readFileSync('inputs').toString().trim().split('\n').map(v=>v.split(' ').map(Number))

const [N, M] = lines.shift()
const paths = lines.filter(([a,b])=>b<a)
paths.sort((a,b)=>a[0]==b[0]?b[1]-a[1]:b[0]-a[0])
// console.log(paths)

let res = M
if(paths.length>0){
  let end=paths[0][0]
  let start = paths[0][1]
  for(let i=1; i<paths.length; i++){
    // console.log(res)
    const [e, s] = paths[i]
    if(e<start){
      res += (end - start) * 2

      end = e
      start = s
    } else{
      start = Math.min(s, start)
    }
  }
  res += (end - start) * 2
}
console.log(res)