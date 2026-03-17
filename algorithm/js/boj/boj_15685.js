let fs = require('fs')
let lines = fs.readFileSync('/dev/stdin').toString().trim().split('\n');
// let lines = fs.readFileSync('inputs').toString().trim().split('\n');

const ds = [[0, 1], [-1, 0], [0, -1], [1, 0]]
const N = Number(lines.shift())
const curves = lines.map(v=>v.split(' ').map(Number)).map(([x, y, d, g])=>({x,y,di:d,g}))

const board = Array(101).fill(0).map(v=>Array(101).fill(false))

for(let i=0; i<N; i++){
  // N개 board에 그리기
  // console.log('curve', i)
  const {x, y, di, g} = curves[i]
  board[y][x] = true

  let path = [di]

  // g만큼 드래곤 커브
  for(let i=0; i<g; i++){
    const newPath = [...path].map(v=>((v+1)%4)).reverse()
    path = path.concat(newPath)
  }

  let cy=y, cx=x
  // console.log(path)
  // 그리기
  for(let i=0; i<path.length; i++){
    const cdi = path[i]
    cy += ds[cdi][0]
    cx += ds[cdi][1]
    board[cy][cx] = true
    // console.log('passing ', cy, cx)
  }
}

let res = 0

for(let y=0; y<100; y++){
  for(let x=0; x<100; x++){
    if(board[y][x] && board[y+1][x] && board[y][x+1] && board[y+1][x+1]){
      res++
    }
    // if(board[y][x]) console.log(y, x)
  }
}

console.log(res)