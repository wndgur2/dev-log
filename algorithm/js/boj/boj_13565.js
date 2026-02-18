const fs = require('fs')
const lines = fs.readFileSync('/dev/stdin').toString().trim().split('\n')
const [M, N] = lines.shift().split(' ').map(Number)
const board = lines.map(s => Array.from(s).map(v=>Boolean(Number(v))))

let flag = false
const ds = [[1, 0], [0, 1], [0, -1], [-1, 0]]
const visited = Array(M).fill(0).map(v=>Array(N).fill(false))

for(let i=0; i<N; i++)
  dfs(0, i)

console.log(flag?'YES':'NO')


function dfs(y, x){
  if(y===M-1) return flag = true
  if(flag) return
  if(board[y][x] || visited[y][x]) return
  visited[y][x] = true

  for(let di=0; di<4; di++){
    const [dy, dx] = ds[di]
    const ny = y + dy
    const nx = x + dx
    if(ny<0 || nx<0 || ny>=M || nx>=N) continue
    if(visited[ny][nx] || board[ny][nx]) continue
    dfs(ny, nx)
  }
}