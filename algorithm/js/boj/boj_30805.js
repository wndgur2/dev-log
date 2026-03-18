let fs = require('fs');
// let lines = fs.readFileSync('/dev/stdin').toString().trim().split('\n');
let lines = fs.readFileSync('inputs').toString().trim().split('\n');

// 사전순 활용
// 큰 수부터 공통수열 찾기 시작, 찾으면 바로 리턴
// 없다면 0까지 내려올 것이며, 이땐 0 출력


const a = lines[1].split(' ')
const b = lines[3].split(' ')

const res = search(100, 0, 0)

console.log(res.length)
if(res.length>0) console.log(res.join(' '))

function search(n, s1, s2){
  if(n<=0 || s1>=a.length || s2>=b.length) return []

  // n부터 시작하는 공통수열 찾고 없으면 search(n-1) 리턴
  let ai=-1, bi=-1
  for(let i=s1; i<a.length; i++){
    if(a[i] == n) {
      ai = i
      break
    }
  }
  for(let i=s2; i<b.length; i++){
    if(b[i] == n) {
      bi = i
      break
    }
  }
  if(ai==-1 || bi==-1)
    return search(n-1, s1, s2)

  const res = [n]
  const tail = search(n, ai+1, bi+1)
  for(let i=0; i<tail.length; i++) res.push(tail[i])

  return res
}