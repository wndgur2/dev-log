const fs = require('fs')

function solve(){
  const [[n], seq] = fs.readFileSync('/dev/stdin').toString().trim().split('\n').map(v=>v.split(' ').map(Number))
  // const [[n], seq] = fs.readFileSync('inputs').toString().trim().split('\n').map(v=>v.split(' ').map(Number))
  
  const sum = seq.reduce((p,c)=>p+c, 0)
  const s = Number(sum/4)
  if(s%1!=0){
    console.log(0)
    return
  }
  
  const idxs = Array(3).fill(0).map(v=>[])
  const sums = Array(n).fill(0)
  sums[0] = seq[0]  
  for(let i=0; i<n; i++){
    if(i>0)
      sums[i] = sums[i-1] + seq[i]
    if(s===0 && sums[i]===0){
      idxs[0].push(i)
      idxs[1].push(i)

      if(((sum-sums[i])!==s) || (i==n-1)) continue
      idxs[2].push(i)
    } else if(sums[i]%s==0 && Math.floor(sums[i]/s)>0){
      const mod = Math.floor(sums[i]/s)-1
      if((mod>2) || (mod===2 && (sum-sums[i])!==s)) continue
      idxs[mod].push(i)
    }
  }

  const posFrom1 = Array(idxs[1].length).fill(0)
  for(let i=idxs[1].length-1; i>=0; i--){
    const nii = bs(idxs[2], idxs[1][i])
    if(nii>=idxs[2].length) continue
    posFrom1[i] = idxs[2].length - nii + (i<idxs[1].length-1?posFrom1[i+1]:0)
  }

  let ans = 0
  
  for(let i=0; i<idxs[0].length; i++){
    const ni = bs(idxs[1], idxs[0][i])
    if (ni>=idxs[1].length) continue
    ans += posFrom1[ni]
  }

  console.log(ans)
}

function bs(arr, v){
  // arr에서 v 초과 최소 원소의 idx 리턴 (없다면 -1)
  let l=0, r=arr.length-1, mid;
  while(l+1<r){
    mid=Math.floor((l+r)/2)
    const midV = arr[mid]
    if(midV<v) l=mid
    else r=mid
  }
  while(arr[l]<=v) l++
  while(arr[l]>v) l--
  return l+1
}

solve()