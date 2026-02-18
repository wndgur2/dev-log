const fs = require('fs')
const lines = fs.readFileSync('/dev/stdin').toString().trim().split('\n')
const N = Number(lines[0])
const res = []

for(let i=0; i<N; i++){
  const word = lines[1+i]
  const wordArray = word.split('')
  wordArray.sort()

  const charCounts = {}
  for(let j=0; j<wordArray.length; j++){
    const char = wordArray[j]
    charCounts[char] = charCounts[char]? charCounts[char]+1:1
  }

  dfs(charCounts, "")

  function dfs(charCounts, string){
    if(string.length==wordArray.length) 
      return res.push(string)
  
    for(const char in charCounts){
      if(charCounts[char]>0){
        charCounts[char]--
        dfs(charCounts, string+char)
        charCounts[char]++
      }
    }
  }
}

console.log(res.join('\n'))
