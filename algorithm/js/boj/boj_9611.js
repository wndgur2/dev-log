let fs = require('fs')
let N = Number(fs.readFileSync('/dev/stdin').toString().trim())
// let N = Number(fs.readFileSync('inputs').toString().trim())

let res

if(N%5==0 || N%5==2){
  res = 'CY'
} else{
  res = 'SK'
}

console.log(res)