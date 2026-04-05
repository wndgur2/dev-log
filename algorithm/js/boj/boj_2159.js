const MAX_DISTANCE = 10_000_000_000

let fs = require('fs');
// let [input1, input2, ...input3] = fs.readFileSync('inputs').toString().trim().split('\n');
let [input1, input2, ...input3] = fs.readFileSync('/dev/stdin').toString().trim().split('\n');

const N = +input1
const coords = input3.map(v=>v.split(' ').map(Number))

const ds = [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]

const dp = Array(N+1).fill(0).map(v=>Array(5).fill(MAX_DISTANCE))
dp[0] = [0,1,1,1,1]

let [y, x] = input2.split(' ').map(Number)

for(let i=1; i<=N; i++){
  const [ny, nx] = coords[i-1]
  for(let di=0; di<5; di++){
    const [cy, cx] = [y+ds[di][0], x+ds[di][1]]
    const oc = dp[i-1][di]
    for(let dj=0; dj<5; dj++){
      const [ty, tx] = [ny+ds[dj][0], nx+ds[dj][1]]
      const nc = Math.abs(cy-ty) + Math.abs(cx-tx)

      if(oc+nc < dp[i][dj]){
        dp[i][dj] = oc+nc
      }
    }
  }
  [y, x] = [ny, nx]
}

console.log(Math.min(...dp[N]))
