let fs = require('fs');
let [x1, y1, r1, x2, y2, r2] = fs.readFileSync('/dev/stdin').toString().trim().split(' ').map(Number);
// let [x1, y1, r1, x2, y2, r2] = fs.readFileSync('inputs').toString().trim().split(' ').map(Number);

const d = Math.sqrt(Math.pow(x1-x2, 2) + Math.pow(y1-y2, 2))

let res = 0
const R = r1>r2?r1:r2
const r = r1<r2?r1:r2

// 내포
if(d+r <= R) {
  res = Math.PI * Math.pow(r, 2)
}

// 교차하지 않음
else if(d>=R+r){
  res = 0
} else{
  // 교차 ( 두 활꼴의 넓이 )
  
  
  let seta1 = getSeta(r1, d, r2)*2
  let seta2 = getSeta(r2, d, r1)*2
  
  // console.log(seta1, seta2)
  
  const radian1 = seta1*180/Math.PI
  const radian2 = seta2*180/Math.PI
  // console.log(seta1, seta2)
  
  const seg1 = getSegment(r1, seta1)
  const seg2 = getSegment(r2, seta2)
  
  // console.log('segs', seg1, seg2)
  
  res = seg1+seg2
  
  // console.log('res', res)
  
  const rect1 = getRectangle(r1, seta1/2)
  const rect2 = getRectangle(r2, seta2/2)
  
  // console.log('rects', rect1, rect2)
  
  if(radian1>180) res+=rect1
  else res-=rect1
  
  if(radian2>180) res+=rect2
  else res-=rect2
}
  
console.log(res.toFixed(3))

function getSeta(a, b, c){
  return Math.acos((Math.pow(a, 2)-Math.pow(c, 2)+Math.pow(b,2))/(2*a*b)) 
}
  
function getSegment(r, seta){
  const radian = seta * 180/Math.PI
  return Math.pow(r, 2) * Math.PI * radian / 360
}

function getRectangle(r, seta){
  return Math.abs(Math.pow(r,2) * Math.cos(seta) * Math.sin(seta))
}