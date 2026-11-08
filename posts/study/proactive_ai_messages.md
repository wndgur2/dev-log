---
category: Study
title: 먼저 말을 거는 AI와 장기 기억 설계 (Chatty)
date_started: 2026.05.03
tags: LLM, Ollama, Qdrant, RAG, NestJS, Socket.IO, proactive message, memory
---

> 임시 게시글: GitHub 기록을 바탕으로 작성한 초안이며, 이후 다듬을 예정이다.

> [Chatty](https://github.com/wndgur2/chatty)에서 AI가 사용자 입력 없이 먼저 메시지를 보내는 구조와,  
> 오래된 대화를 기억하는 메모리 구조를 구현한 그대로 정리했다.

## 1. 전체 흐름

AI 메시지는 두 경로로 생긴다.

- **reply**: 사용자가 메시지를 보냄 → 백그라운드에서 답변 생성
- **proactive**: cron이 채팅방을 평가 → 평가 모델이 `YES` → 백그라운드에서 메시지 생성

두 경로 모두 `MessagesService.processBackgroundMessage(chatroomId, proactive)`를 거친다.  
이 함수에서 메모리를 조회해 system prompt를 만들고, Ollama 스트림을 Socket.IO로 흘려보낸 뒤 DB에 저장한다.

## 2. Proactive 메시지: 평가 스케줄

채팅방 row가 스케줄 상태를 직접 들고 있다. `current_delay_seconds`는 다음 평가까지 기다릴 시간, `next_evaluation_time`은 다음 평가 시각이다(`null`이면 평가 대상 아님).

```ts
export const AI_BACKGROUND_EVALUATION_CRON = CronExpression.EVERY_5_SECONDS;
export const INITIAL_AI_EVALUATION_DELAY_SECONDS = 4;
export const MAX_VOLUNTARY_MESSAGES_IN_A_ROW = 3;
```

1. 사용자가 메시지를 보내면 `next_evaluation_time`을 `null`로 비운다. 답변 생성 중에는 평가하지 않는다.
2. AI 메시지가 저장되면 `resetDelay`로 delay를 4초로 되돌리고 4초 뒤를 다음 평가 시각으로 잡는다.
3. cron이 5초마다 `next_evaluation_time <= now`인 방을 찾는다.
4. 평가 모델이 `NO`라고 하면 delay를 두 배로 늘린다. 4 → 8 → 16 → 32초 …
5. `YES`라고 하면 proactive 메시지를 생성한다. 생성이 끝나면 다시 2번으로 간다.

문서에서는 이를 "slow-start" 방식이라고 부른다. 대화 직후에는 자주 확인하고, 반응이 없을수록 확인 간격이 지수적으로 늘어난다.

### 중복 처리 방지

- `isProcessing` 플래그로 이전 tick이 끝나기 전에 다음 tick이 겹치지 않게 했다.
- 평가 직전에 `nextEvaluationTime`을 `null`로 바꿔 같은 방을 다시 집지 않게 했다.

### 연속 proactive 상한

AI 메시지가 저장될 때마다 delay가 4초로 초기화되기 때문에, 평가가 계속 `YES`면 AI가 혼자 계속 말할 수 있다.  
그래서 `proactiveAiCountInRowFromNewestFirst`로 최신 메시지부터 연속된 AI 메시지 수를 센다. 그중 첫 번째는 사용자에 대한 reply로 보고 1을 뺀다.  
이 값이 3 이상이면 평가 모델을 호출하지 않고 바로 backoff한다.

### 평가 모델

- 입력: 채팅방 base prompt, 최근 메시지 최대 10개, 마지막 메시지 이후 경과 시간
- 출력: Ollama structured output으로 `{ "decision": "YES" | "NO" }` JSON schema를 강제한다.
- 사용자가 리마인더나 알림을 요청한 경우 `YES`라고 하도록 프롬프트에 적었다.
- 평가 호출이 실패하면 `NO`로 처리한다.

### proactive 메시지 생성

reply와 같은 생성 함수를 쓰지만 설정을 다르게 준다.

| 항목 | reply | proactive |
|---|---|---|
| 최근 대화 window | 8개 | 5개 |
| decoding | `temperature 0.8` | `temperature 0.4`, `repeat_penalty 1.12`, `num_predict 140` |
| 추가 지시 | 없음 | 3문장/80단어 이내, 직전 답변 반복 금지 |

생성된 메시지는 `ai_message_metadata`에 `delivery_mode: proactive`, `trigger_reason: scheduler_evaluation_yes`로 남기고, FCM이 설정되어 있으면 푸시 알림을 보낸다.

## 3. 메모리: 두 계층

최근 대화(기본 8개)는 그대로 history로 넣는다. 그보다 오래된 사용자 메시지는 두 가지 방식으로 보관한다.

| 계층 | 저장소 | 내용 | 조회 |
|---|---|---|---|
| Snippet | Qdrant | 메시지 원문 chunk + 임베딩 | 현재 질문과의 유사도 검색 |
| Canonical | MySQL `memories` | `kind`/`key`/`value` 구조화 사실 | 채팅방 기준 전체(상한 있음) |

### 인덱싱 시점

사용자 메시지를 저장할 때마다 두 작업을 fire-and-forget으로 실행한다.

- `indexOlderMessage`: 최신순으로 `RAG_RECENT_WINDOW`(8)개를 건너뛴 메시지 1개를 고른다. 사용자 메시지이고 아직 인덱싱되지 않았을 때만 처리한다.
- `extractOlderMessage`: 같은 기준으로 고른 메시지에서 canonical memory를 추출한다.

즉 **history window에서 막 밀려난 메시지**만 메모리로 옮긴다. 최근 대화와 메모리가 겹치지 않는다.

### Snippet: Qdrant + Ollama 임베딩

- 임베딩 모델: Ollama `all-minilm`. 컬렉션은 384차원, Cosine distance로 만든다.
- 짧은 메시지(200자 미만 또는 문장 3개 이하)는 통째로 임베딩한다.
- 긴 메시지는 semantic chunking을 한다. 인접 문장 window의 임베딩 cosine distance를 구하고, 95 percentile을 넘는 지점에서 자른다. 1200자를 넘는 chunk는 200자 overlap으로 다시 자른다.
- point ID는 `messageId#chunkIndex`의 sha1으로 UUID 형식을 만든다. 같은 chunk를 다시 넣어도 같은 ID다.

검색할 때는 history에서 가장 최근 사용자 메시지를 query로 임베딩한다.

```ts
await this.qdrantClient.search(this.collectionName, {
  vector: req.vector,
  limit: req.limit,               // RAG_TOP_K = 5
  score_threshold: req.minScore,  // RAG_MIN_SCORE = 0.4
  filter: {
    must: [{ key: 'chatroomId', match: { value: req.chatroomId } }],
    must_not: [{ key: 'messageId', match: { any: req.excludeMessageIds } }],
  },
});
```

같은 채팅방만 검색하고, 이미 history에 들어간 메시지는 제외한다. 결과는 200자(`RAG_SNIPPET_CHARS`)로 자른다.

### Canonical memory: 추출과 제한

추출 모델에는 대상 메시지와 주변 최근 메시지 4개를 준다. JSON schema로 다음 형태를 강제하고 `temperature 0.2`로 호출한다.

```json
{ "memories": [{ "kind": "preference", "key": "preferred_tone", "value": "...", "confidence": 0.9 }] }
```

- `kind`는 `fact`, `preference`, `task`, `project_state`, `relationship`, `other` 중 하나다.
- `key`는 snake_case로 안정적으로 쓰라고 지시했다. 같은 사실이 다시 나오면 덮어쓰기 위해서다.
- 저장 전 정규화: 잘못된 `kind`나 빈 `key`/`value`는 버리고, `confidence`는 0~1로 clamp한다.
- `confidence < 0.6`(`MEMORY_EXTRACTION_MIN_CONFIDENCE`)이면 저장하지 않는다.
- `(chatroom_id, kind, key)` unique 제약으로 upsert한다. 값이 바뀌면 최신 값으로 갱신된다.
- `source_message_id`로 이미 추출한 메시지는 건너뛴다.

조회할 때는 `superseded_at IS NULL`인 row를 `kind`, `updated_at desc` 순으로 최대 `MEMORY_CANONICAL_LIMIT`(기본 20)개만 가져온다. 이 env 값은 1~10,000 범위로 검증하고 clamp한다.

### 프롬프트 조립

```text
[system prompt + base prompt]

## Known user/project state
- preference: preferred_tone = "..."

## Older user messages in this chat
- (2026-04-30) "..."
```

두 블록 모두 "최근 대화와 충돌하면 최근 대화를 따르라"는 지시를 붙였다. snippet은 잘린 문장일 수 있으니 없는 내용을 지어내지 말라는 지시도 넣었다.

## 4. 스트리밍 응답과 게스트 세션

- 전송 API는 사용자 메시지만 저장하고 `202`를 돌려준다. 답변은 `chatroom_{id}` Socket.IO room으로 `ai_typing_state` → `ai_message_chunk`(누적 문자열) → `ai_message_complete` 순서로 보낸다. proactive 메시지도 같은 이벤트를 쓴다. (자세한 내용은 Socket.IO 스트리밍 글에 정리했다.)
- 첫 방문 시 `useEnsureGuestSession`이 게스트 JWT(`typ: "guest"`)를 발급받는다. 채팅방, 메모리, FCM 토큰은 `user_id`와 `guest_session_id` 중 하나만 갖고, 이 규칙은 `OwnerScope`로 애플리케이션에서 지킨다.
- 로그인 후 `POST /api/auth/merge-guest`를 부르면 게스트 데이터를 한 트랜잭션에서 회원에게 옮기고 `merged_at`을 찍는다. 이후 그 게스트 토큰은 거부된다.

## 5. 정리

- 스케줄 상태를 채팅방 row 두 컬럼에 두고, 5초 cron이 "시각이 된 방"만 평가하게 해서 구조를 단순하게 유지했다.
- 평가 → backoff → 연속 상한, 세 단계가 AI가 먼저 말하되 메시지가 쏟아지지 않게 막는 장치다.
- 메모리는 "원문 검색(snippet)"과 "구조화된 사실(canonical)"로 나눴다. 앞쪽은 맥락을, 뒤쪽은 오래 유지할 상태를 맡는다.
