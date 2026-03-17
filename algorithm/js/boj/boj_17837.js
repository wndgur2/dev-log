const fs = require('fs')
const lines = fs.readFileSync('inputs').toString().trim().split('\n').map(v=>v.split(' ').map(Number))
// const lines = fs.readFileSync('/dev/stdin').toString().trim().split(' ').map(Number)

const ds = [[0, 1], [0, -1], [-1, 0], [1, 0]]

const [N, K] = lines.shift()

const board = lines.splice(0, N)
const units = lines.map(([y, x, di], i)=>({
  y:y-1,
  x:x-1,
  di:di-1,
}))

const chunkBoard = Array(N).fill(0).map(v=>Array(N).fill(null))
for(let i=0; i<K; i++){
  const {y, x} = units[i]
  chunkBoard[y][x] = [i]
}

let chunkCount = K


console.log(N, K)
console.log(board)
console.log(chunkBoard)
console.log(units)
console.log(chunkBoard)

let turn = 0
let res = -1
while(chunkCount > K && turn <= 1000){
  for(let i=0; i<K; i++){
    move(i)
  }
}

if(turn<=1000) res = turn
console.log(res)

function move(i){
  const {cy, cx, cdi} = units[i]
  let [dy, dx] = ds[cdi]
  let [ny, nx] = [cy+dy, cx+dx]
  let ndi = cdi

  const chunk = chunkBoard[cy][cx]

  if(isBlue(ny, nx)){
    ndi = getReversedDir(cdi)
    [dy, dx] = ds[ndi]
    [ny, nx] = [cy+dy, cx+dx]
    if(isBlue(ny, nx)){
      ny = cy
      nx = cx
    }
  } else if(board[ny][nx] == 1){
    // reverse chunk
  }

  if(!(ny==cy && nx==cx)){
    chunkBoard[cy][cx] = null

    if(chunkBoard[ny][nx]!=null){
      chunkBoard[ny][nx] = [...chunkBoard[ny][nx], ...chunk]
    } else{
      chunkBoard[ny][nx] = chunk
    }
  }

}

function isBlue(ny, nx){
  if(ny<0 || ny>=N || nx<0 || nx>=N || board[ny][nx]==2) return true
  return false
}

function getReversedDir(di){
  if(di==0) return 1
  else if(di==1) return 0
  else if(di==2) return 3
  else if(di==3) return 2
}