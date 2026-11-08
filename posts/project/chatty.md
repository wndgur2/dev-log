---
category: Project
title: Chatty
description: 사용자가 말을 걸지 않아도 AI가 먼저 메시지를 보내는 실시간 스트리밍 AI 채팅 앱이다.
date_started: 2026.04.08
date_finished:
head_count: 1
role: Full-stack
tags: NestJS, React, Socket.IO, Ollama, Qdrant, RAG, Prisma, MySQL, PWA
---

> 임시 게시글: GitHub 기록을 바탕으로 작성한 초안이며, 이후 다듬을 예정이다.

## 개요

Chatty는 LLM 기반 웹 채팅 앱이다.  
일반적인 채팅 앱은 사용자가 입력해야 AI가 답하지만, Chatty는 **스케줄러가 주기적으로 대화를 평가해서 AI가 먼저 말을 걸 수 있게** 만들었다.

- 응답은 Socket.IO로 실시간 스트리밍한다.
- 채팅방마다 base prompt와 프로필 이미지를 따로 둔다.
- 오래된 대화는 장기 기억(Qdrant 벡터 검색 + 구조화된 canonical memory)으로 프롬프트에 다시 넣는다.
- 로그인 없이 게스트로 바로 쓰고, 나중에 회원 계정으로 합칠 수 있다.

> 커밋 기록상 사람 기여자는 1명이고, 나머지는 Cursor/Copilot 에이전트 커밋이다. 그래서 인원은 1명으로 적었다.

## 사용 기술

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, TanStack Query, Zustand, Socket.IO client, vite-plugin-pwa |
| Backend | NestJS 11, TypeScript, Prisma, `@nestjs/schedule` |
| Database | MySQL 8 |
| LLM | Ollama (채팅, 평가, 메모리 추출, 임베딩) |
| Vector store | Qdrant |
| Push | Firebase Cloud Messaging (선택) |
| Infra | Docker Compose, nginx, GitHub Actions, GHCR (ARM64 이미지) |

## 구조/아키텍처

모노레포로 `frontend/`, `backend/`, `deploy/`를 한 저장소에 두었다.

```text
Browser (React SPA, PWA)
  ├─ REST  /api/**        ─┐
  └─ WS    /socket.io/**  ─┤ nginx
                           └─ NestJS
                               ├─ messages (REST + MessagesGateway)
                               ├─ tasks    (cron: proactive 평가)
                               ├─ inference (Ollama adapter: chat / eval / extract / embed)
                               ├─ messages/memory (indexing, extraction, retrieval)
                               └─ infrastructure (Qdrant, storage)
                             MySQL (Prisma) · Qdrant · Ollama
```

- `inference` 모듈은 port/adapter 구조로 나눴다. `ChatCompletionPort`, `EmbeddingPort`, `MemoryExtractionPort`, `ProactiveMessageEvaluationPort`를 Ollama adapter가 구현한다.
- 메시지 전송 API는 사용자 메시지만 저장하고 `202 Accepted`를 돌려준다. AI 답변은 백그라운드에서 생성해 Socket.IO로 흘려보낸다.
- AI 메시지에는 1:1로 `ai_message_metadata`(`delivery_mode`: `reply` | `proactive`, `trigger_reason`, `read_at` 등)를 붙여 왜 보내졌는지 남긴다.

## 주요 기능

- **스트리밍 응답**: `ai_typing_state` → `ai_message_chunk`(누적 문자열) → `ai_message_complete` 순서로 이벤트를 보낸다.
- **Proactive AI 메시지**: 마지막 메시지 후 4초 뒤 평가를 시작하고, 평가 모델이 `NO`라고 하면 대기 시간을 두 배로 늘린다. AI 단독 메시지는 연속 3번까지만 허용한다.
- **장기 기억**
  - 최근 대화 범위(기본 8개)를 벗어난 사용자 메시지를 semantic chunking 후 임베딩해 Qdrant에 저장한다.
  - 같은 메시지에서 LLM으로 `fact`, `preference`, `task` 같은 durable memory를 JSON으로 뽑아 MySQL `memories`에 upsert한다.
- **채팅방 관리**: 생성/수정/삭제, clone(설정만 복사), branch(설정 + 대화 기록 복사).
- **게스트 세션**: 첫 방문 시 게스트 JWT를 자동 발급한다. 로그인하면 `POST /api/auth/merge-guest`로 채팅방, 메모리, FCM 토큰을 한 트랜잭션에서 회원에게 옮긴다.
- **푸시 알림**: proactive 메시지가 생기면 FCM으로 알린다. 게스트 세션에도 기기 토큰을 연결할 수 있다.
- **기타**: KaTeX 수식 렌더링, PWA 설치, 빌드 메타데이터(release SHA) 표시.

## 구현하며 다룬 문제

### 스트리밍 chunk를 delta에서 누적값으로 변경

처음에는 토큰 delta를 보내고 클라이언트가 `old + chunk`로 이어 붙였다.  
2026.04.27에 서버가 지금까지의 전체 문자열을 보내고, 클라이언트는 그 값으로 교체하도록 바꿨다. API 문서에도 `"a"` → `"ab"` → `"abc"` 형태라고 명시했다.

### Socket.IO CORS와 HTTP CORS 불일치

HTTP는 `CORS_ORIGIN` 환경변수를 썼는데, gateway는 `origin: '*'`로 고정되어 있었다.  
gateway도 `process.env.CORS_ORIGIN ?? '*'`를 읽도록 맞췄다.

### Proactive 메시지 폭주 방지

AI 메시지를 보내면 delay가 다시 4초로 초기화되기 때문에, 평가가 계속 `YES`면 메시지가 이어질 수 있다.  
그래서 최근 메시지에서 연속된 proactive AI 메시지 수를 세고, 3개 이상이면 평가 없이 바로 backoff하도록 했다.

### 게스트 소유권 모델

채팅방, 메모리, 기기 토큰은 `user_id`와 `guest_session_id` 중 정확히 하나만 갖는다.  
MySQL `CHECK` 제약은 두 컬럼이 FK referential action에 걸려 있어 거부되었고(error 3823), 그래서 애플리케이션 코드(`OwnerScope`)에서 이 규칙을 지킨다.

### 배포 안정성

- GitHub Actions로 ARM64 이미지를 빌드해 GHCR에 올리고 SSH로 배포한다.
- 빌드 job은 새 커밋이 오면 이전 실행을 취소하고, 배포 job은 직렬화하고 취소하지 않는다.
- 배포 시점의 SHA가 `main`의 최신 head와 다르면 배포하지 않는다.

## Links

- Service: [https://chatty.sam-lee.cloud/](https://chatty.sam-lee.cloud/)
- GitHub: [https://github.com/wndgur2/chatty](https://github.com/wndgur2/chatty)
