---
category: Study
title: NestJS + React에서 Socket.IO로 LLM 응답 스트리밍하기
date_started: 2026.04.27
tags: Socket.IO, NestJS, React, WebSocket, streaming, LLM, Ollama, CORS, nginx
---

> 임시 게시글: GitHub 기록을 바탕으로 작성한 초안이며, 이후 다듬을 예정이다.

> [Chatty](https://github.com/wndgur2/chatty)에서 Ollama 응답을 Socket.IO로 흘려보내는 구조를 정리했다.  
> 서버(NestJS gateway), 클라이언트(React hook), 그 사이의 프록시 설정 순서로 본다.

## 1. 구조: HTTP로 트리거, 소켓으로 수신

메시지 전송과 응답 수신을 다른 채널로 나눴다.

```text
Client ── POST /api/chatrooms/:id/messages ──▶ Server   (202 Accepted + 저장된 user message)
Client ◀── ai_typing_state / ai_message_chunk / ai_message_complete ── Server (Socket.IO room)
```

![시퀀스 다이어그램: 클라이언트가 joinRoom 후 POST로 메시지를 보내고 202를 받으면, 서버가 gateway를 통해 ai_typing_state, 누적 ai_message_chunk, ai_message_complete를 room으로 보내고 클라이언트가 쿼리 캐시에 최종 메시지를 넣는다](/images/posts/socketio-llm-streaming/sequence.svg)
*그림. HTTP 요청은 202로 바로 끝나고, 답변은 gateway가 room으로 보내는 누적 chunk로 도착해 complete 때 쿼리 캐시에 들어간다.*

- HTTP 요청은 사용자 메시지를 저장하고 바로 `202`를 돌려준다. 응답 본문에 AI 답변은 없다.
- AI 답변 생성은 백그라운드에서 시작하고, 결과는 해당 채팅방의 Socket.IO room으로 보낸다.
- 사용자 요청 없이 생기는 proactive 메시지도 같은 소켓 이벤트로 보낼 수 있다. 소켓을 별도 채널로 둔 덕분이다.

## 2. 서버: Gateway

```ts
@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN ?? '*' },
})
export class MessagesGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(@MessageBody() data: { chatroomId: number }, @ConnectedSocket() client: Socket) {
    await client.join(`chatroom_${data.chatroomId}`);
    return { event: 'joined', data: { room: data.chatroomId } };
  }

  streamChunkToRoom(chatroomId: number, chunk: string) {
    this.server.to(`chatroom_${chatroomId}`).emit('ai_message_chunk', { chatroomId, chunk });
  }
}
```

채팅방 하나를 Socket.IO room `chatroom_{id}` 하나로 매핑했다. 같은 방을 연 탭/기기가 모두 같은 스트림을 받는다.  
클라이언트 → 서버 이벤트는 `joinRoom`, `leaveRoom` 두 개, 서버 → 클라이언트 이벤트는 세 개다.

| Event | Payload | 의미 |
|---|---|---|
| `ai_typing_state` | `{ chatroomId, isTyping }` | 생성 시작/종료 |
| `ai_message_chunk` | `{ chatroomId, chunk }` | 지금까지 생성된 전체 문자열 |
| `ai_message_complete` | `{ chatroomId, content, messageId }` | 최종 본문과 DB id |

비즈니스 로직은 gateway를 직접 부르지 않고 `MessageStreamService`(`setTyping`, `streamChunk`, `streamComplete`)를 통해 emit한다.

## 3. 서버: Ollama 스트림을 누적값으로

Ollama adapter는 `stream: true`로 받은 응답을 async iterator로 감싸 delta를 내보낸다.  
`ChatGenerationService`가 delta를 이어 붙이고, 콜백에는 **누적된 전체 문자열**을 넘긴다.

```ts
let fullContent = '';
for await (const chunk of stream) {
  const text = chunk.delta;
  if (text) {
    fullContent += text;
    onChunk?.(fullContent);
  }
}
return fullContent;
```

### delta → 누적값으로 바꾼 이유 (2026.04.27)

처음에는 `onChunk(text)`로 delta를 보내고, 클라이언트가 `old + chunk`로 붙였다. 지금은 서버가 누적값을 보내고 클라이언트는 교체만 한다.  
커밋에는 이유가 적혀 있지 않아서, 아래는 내가 정리한 trade-off다.

- **장점**: 클라이언트 state가 항상 서버의 마지막 값과 같다. 중간 chunk를 놓치거나, 재연결 후 늦게 붙어도 다음 chunk 하나로 화면이 맞춰진다.
- **단점**: payload가 응답 길이만큼 계속 커진다. 전체 전송량은 길이의 제곱에 비례한다.

![delta와 누적값 비교: 중간 chunk가 유실되면 delta 방식은 "ac"가 남고, 누적값 방식은 다음 chunk "abc"로 화면이 맞춰진다](/images/posts/socketio-llm-streaming/delta-vs-cumulative.svg)
*그림. 중간 chunk 하나를 놓쳤을 때 delta 방식은 글자가 빠진 채 남고, 누적값 방식은 다음 chunk로 복구된다.*

## 4. CORS: HTTP와 소켓 설정 맞추기 (2026.05.03)

HTTP 서버(`main.ts`)는 `CORS_ORIGIN` 환경변수를 썼다.

반면 gateway는 `origin: '*'`로 고정되어 있었다. 같은 서비스인데 REST와 소켓의 허용 origin이 달랐던 것이다.  
gateway도 `process.env.CORS_ORIGIN ?? '*'`를 읽도록 고치고, API 문서에도 "HTTP API와 같은 env로 제어한다"고 적었다.

`@WebSocketGateway()` 옵션은 데코레이터 인자라서 클래스가 로드될 때 평가된다. 그래서 `ConfigService` 주입 대신 `process.env`를 직접 읽는다.

## 5. 클라이언트: `useWebSocketStream`

```ts
const socket = io(WS_URL, { path: '/socket.io', transports: ['websocket'] })

socket.on('connect', () => {
  setStreamingContent('')
  socket.emit('joinRoom', { chatroomId })
})
socket.on('ai_typing_state', handleTypingState)
socket.on('ai_message_chunk', handleMessageChunk)
socket.on('ai_message_complete', handleMessageComplete)
```

- `transports: ['websocket']`로 polling 없이 WebSocket만 쓴다. 채팅방이 바뀌면 cleanup에서 리스너를 끄고 `leaveRoom` 후 연결을 끊는다.
- 핸들러는 React 19의 `useEffectEvent`로 만들어 effect 의존성 없이 최신 state를 본다. `payload.chatroomId`가 다르면 무시한다.

### chunk와 complete 처리

```ts
const handleMessageChunk = useEffectEvent((payload) => {
  if (payload.chatroomId !== chatroomId) return
  setIsTyping(false)
  setStreamingContent(payload.chunk) // 누적값이므로 교체
})

const handleMessageComplete = useEffectEvent((payload) => {
  if (payload.chatroomId !== chatroomId) return
  queryClient.setQueryData<Message[]>(getMessagesQueryKey(chatroomId), (old) => {
    if (!old) return []
    const filtered = old.filter((m) => m.id !== payload.messageId)
    return [...filtered, { id: payload.messageId, sender: 'ai', content: payload.content /* ... */ }]
  })
  setStreamingContent('')
})
```

- 스트리밍 중인 텍스트는 별도 state(`streamingContent`)로 두고, `InferIndicator`가 임시 id(`Number.MAX_SAFE_INTEGER`)를 가진 말풍선으로 그린다.
- 완료되면 최종 메시지를 TanStack Query 캐시에 직접 넣는다(refetch 없음). 같은 `messageId`가 있으면 먼저 걸러 중복을 막는다.
- `useChatroomMessageComposer`는 전송/대기/typing/스트리밍 중에는 입력을 잠그고, 사용자 메시지는 `useOptimistic`으로 먼저 보여준다.

## 6. 프록시 설정

### nginx (운영)

```nginx
location /socket.io/ {
    proxy_pass http://chatty_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
```

WebSocket upgrade 헤더를 넘기고, 긴 연결이 끊기지 않게 timeout을 길게 잡았다.

### Vite (개발)

`VITE_DEV_PROXY_TARGET`을 설정하면 `/api`와 `/socket.io`를 Vite가 프록시한다(`ws: true`). 이때 클라이언트는 `io(undefined, ...)`로 same-origin에 붙는다.  
Cloudflare tunnel이나 휴대폰 테스트에서 백엔드 CORS를 신경 쓰지 않아도 된다.

## 7. 남은 점

- `ai_message_complete`의 `messageId`는 number로 emit되지만 REST 응답의 id는 BigInt 직렬화 때문에 string이다.
