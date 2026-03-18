let fs = require('fs');
let lines = fs.readFileSync('/dev/stdin').toString().trim().split('\n');
// let lines = fs.readFileSync('inputs').toString().trim().split('\n');

const res = []
let li = 0
const T = Number(lines[li++])
for(let tc=0; tc<T; tc++){
  const [n, d] = lines[li++].split(' ').map(Number)
  const board = Array(n).fill(0).map(v=>Array(n).fill(0))
  for(let i=0; i<n; i++){
    const row = lines[li++].split(' ').map(Number)
    for(let j=0; j<n; j++){
      board[i][j] = row[j]
    }
  }
  for(let i=0; i<Math.floor(Math.abs(d)/45); i++){
    rotate(board, d>0)
  }

  for(let i=0; i<n; i++){
    res.push(board[i].join(' '))
  }
}

console.log(res.join('\n'))

function rotate(board, CW){
  const n = board.length

  if(CW){
    const mi = Math.floor((n+1)/2)-1
    let t1 = []
    let t2 = []

    // 주대각 -> 가운데열
    for(let i=0; i<n; i++){
      t1.push(board[i][mi])
    }
    for(let i=0; i<n; i++){
      board[i][mi] = board[i][i]
    }

    // 가운데열 -> 부대각
    for(let i=0; i<n; i++){
      t2.push(board[n-1-i][i])
    }
    t1.reverse()
    for(let i=0; i<n; i++){
      board[n-1-i][i] = t1[i]
    }
    
    // 부대각 -> 가운데행
    t1 = []
    for(let i=0; i<n; i++){
      t1.push(board[mi][i])
    }
    for(let i=0; i<n; i++){
      board[mi][i] = t2[i]
    }

    // 가운데행 -> 주대각
    for(let i=0; i<n; i++){
      board[i][i] = t1[i]
    }
  } else{
    const mi = Math.floor((n+1)/2)-1
    let t1 = []
    let t2 = []

    // 주대각 -> 가운데행
    for(let i=0; i<n; i++){
      t1.push(board[mi][i])
    }
    for(let i=0; i<n; i++){
      board[mi][i] = board[i][i]
    }

    // 가운데행 -> 부대각
    for(let i=0; i<n; i++){
      t2.push(board[n-1-i][i])
    }
    for(let i=0; i<n; i++){
      board[n-1-i][i] = t1[i]
    }
    
    // 부대각 -> 가운데열
    t1 = []
    for(let i=0; i<n; i++){
      t1.push(board[i][mi])
    }
    t2.reverse()
    for(let i=0; i<n; i++){
      board[i][mi] = t2[i]
    }

    // 가운데열 -> 주대각
    for(let i=0; i<n; i++){
      board[i][i] = t1[i]
    }
  }
}