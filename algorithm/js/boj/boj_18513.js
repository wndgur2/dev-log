let fs = require('fs');
let [[, H], shelters] = fs.readFileSync('/dev/stdin').toString().trim().split('\n').map(line=>line.split(' ').map(Number))
// let [[, H], shelters] = fs.readFileSync('inputs').toString().trim().split('\n').map(line=>line.split(' ').map(Number))

// 거리 -> 샘터 2중 for문
const facility = new Set()

for(let shelter of shelters){
  facility.add(shelter)
}

let res = 0
let distance = 1
while(H>0){
  const newShelters = []
  for(let shelter of shelters){ // 10만 --> 사이가 다 차있으면 압축
    const l = shelter-distance
    const r = shelter+distance
    if(!(facility.has(l) && facility.has(r))){
      newShelters.push(shelter)
    } else
      continue
      
    // left
    if(!facility.has(l)){
      facility.add(l)
      H--
      res += distance
    }
    if(H==0) break

    // right
    if(!facility.has(r)){
      facility.add(r)
      H--
      res += distance
    }
    if(H==0) break

  }
  shelters = newShelters
  distance++
}

console.log(res)