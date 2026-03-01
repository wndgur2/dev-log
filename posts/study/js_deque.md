---
category: Study
title: JS로 덱(Double-ended queue) 구현하기
date_started: 2026.01.13
date_updated: 2026.01.13
tags: deque, data-structure, javascript, queue
github: 'https://github.com/wndgur2/BlogDB/blob/main/posts/study/js_deque.md'
---

# Double-ended queue

Double-ended queue(이하 Deque)는 한 방향으로만 입력과 출력이 가능한 Queue를 확장하여 양방향에서 입출력이 가능한 리스트 구조를 말한다.

<img width="451" height="306" alt="deque" src="https://github.com/user-attachments/assets/fe74c9da-924a-4153-a3bb-681e16fef3ab" />

## javascript로 왜 Deque를 구현해야할까?

js에서 Array의 입출력은 주로 `push()`, `pop()`, `unshift()`, `shift()`를 사용한다.

여기서 `push()`와 `pop()`는 배열의 마지막 원소를 추가/제거하는 함수이고, `shift()`, `unshift()`는 배열의 맨 앞 원소를 추가/제거한다.

각 함수의 시간 복잡도는 아래와 같이 구현되어 있다.

| 함수        | 시간복잡도 |
| ----------- | ---------- |
| `push()`    | O(1)       |
| `pop()`     | O(1)       |
| `unshift()` | O(N)       |
| `shift()`   | O(N)       |

따라서, DFS/BFS와 같이 `shift()`나 `unshift()`를 통해 원소 입출력 순서를 제어해야하는 경우, 시간 복잡도가 O(N)으로 늘어나게 된다.

이러한 경우, deque를 구현하면 앞 원소 입출력을 O(1)에 해결할 수 있다.

deque를 구현할 여러 방법이 있겠지만 나는 다양한 활용 여지가 있는 Doubly-Linked-List로 구현해보았다.

# 이중 연결 리스트

이중연결리스트는 각 노드가 앞 노드와 뒷 노드를 참조하여 구현한다.

<img width="640" height="242" alt="Image" src="https://github.com/user-attachments/assets/38fe747b-e014-47f6-b348-9f7a0d9f8e94" />

이중 연결 리스트의 장점은 앞 뒤 노드의 입출력 뿐만 아니라 리스트의 분할이나 병합을 O(1)만에 수행할 수 있다. 이 때문에 시간 복잡도를 고려해야하는 다양한 문제에서 활용된다.

하지만 원소 조회가 O(N)이라는 치명적 단점을 항상 염두하고 사용해야한다.

# Javscript 코드

```js
class Deque {
  head = null
  tail = null
  sum = 0
  size = 0

  pop() {
    if (this.size === 0) return null

    const res = this.head

    this.head = res.next
    if (this.head) {
      this.head.prev = null
    } else {
      this.tail = null
    }

    this.sum -= res.value
    this.size--

    return res
  }

  push(node) {
    if (this.size === 0) {
      this.head = node
      this.tail = node
    } else {
      this.tail.next = node
      node.prev = this.tail
      this.tail = node
    }
    this.sum += node.value
    this.size++
  }
}

class Node {
  prev = null
  next = null
  constructor(v) {
    this.value = v
  }
}

// example
// 2022 KAKAO TECH INTERNSHIP 코딩테스트 - 두 큐 합 같게 만들기

const [queue1, queue2] = [
  [1, 2, 1, 2],
  [1, 10, 1, 2],
]
const N = queue1.length
var answer = -1
const deq1 = new Deque()
const deq2 = new Deque()

for (let i = 0; i < N; i++) {
  deq1.push(new Node(queue1[i]))
  deq2.push(new Node(queue2[i]))
}

console.log(deq1)
console.log(deq2)

let r = 0
while (deq1.sum !== deq2.sum) {
  if (deq1.sum > deq2.sum) {
    const n = deq1.pop()
    deq2.push(new Node(n.value))
  } else {
    const n = deq2.pop()
    deq1.push(new Node(n.value))
  }
  console.log(deq1)
  console.log(deq2)

  if (r++ == N * 2) break
}
if (deq1.sum === deq2.sum) answer = r

console.log(answer)
```
