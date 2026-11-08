---
category: Project
title: Loop
description: 스스로 남긴 피드백을 AI 코치 Loopie가 구조화해 "되돌아보기"를 "목표 달성"으로 잇는 회고 앱이다.
date_started: 2026.05.31
date_finished:
head_count: 1
role: Full-stack · Mobile
tags: expo, react-native, supabase, edge-functions, llm, pwa, vercel, monorepo
---

> 임시 게시글: GitHub 기록을 바탕으로 작성한 초안이며, 이후 다듬을 예정이다.

## 개요

회고가 중요하다는 건 알지만 실제로는 잘 안 된다. 기록은 메모앱에 흩어지고, 근본 원인까지 파고들지 못한 채 다짐으로 끝나며, 그 다짐이 행동으로 이어졌는지 추적할 방법이 없다.

Loop는 이 문제를 **"피드백 → 목표 달성, with AI"** 로 풀려는 앱이다.

1. AI 코치 **Loopie**가 대화로 상황의 근본 원인과 실천항목(Takeaway)을 끌어낸다.
2. 피드백을 사용자의 커리어 목표(최종 목표 → 하위 목표)에 정렬해 진척을 추적한다.
3. 아직 내재화되지 않은 항목을 회고 대화로 다시 꺼내 행동으로 잇는다.

## 사용 기술

| 영역 | 기술 |
|---|---|
| 클라이언트 | Expo (SDK 56, Expo Router) · React Native 0.85 · React 19 · TypeScript (strict) |
| 상태 | TanStack Query (서버 상태), 로컬 UI 상태는 컴포넌트 단위 |
| 백엔드 | Supabase (Postgres · Auth · RLS), 별도 상시 서버 없음 |
| 서버 코드 | Supabase Edge Functions (Deno) |
| AI | LLM 어댑터 — Gemini(기본) / Anthropic / OpenAI를 `LLM_PROVIDER`로 교체 |
| 디자인 시스템 | `@loop/ui` (npm workspaces 내부 패키지) |
| 배포 | EAS Build/Submit (Android) · Vercel (웹, PWA) · GitHub Actions CI/CD |

## 구조

npm workspaces 모노레포다. 루트에는 문서와 플랫폼 공유 자원을 두고, 앱은 `mobile/`에 분리했다.

```
loop/
├── documents/          # PRD, 기능 명세, 데이터 모델, Loopie 스펙, 평가 기준
├── adrs/               # 설계 결정 기록 (0001~0005)
├── evals/              # Loopie 품질 평가 시나리오 + 러너
├── packages/
│   └── design-system/  # @loop/ui — 토큰 + UI 프리미티브
├── supabase/
│   ├── migrations/     # 스키마 + RLS
│   └── functions/      # chat (Loopie), delete-account
└── mobile/             # Expo 앱 (네이티브 + 웹 빌드)
```

- 웹은 별도 소스 없이 `mobile/`의 Expo 앱을 `react-native-web`으로 export한 것이다.
- 모든 LLM 호출은 Edge Function `chat`을 경유한다. 키는 클라이언트에 두지 않는다.
- DB(snake_case) ↔ 앱(camelCase) 변환은 `types/models.ts` 매퍼로 일원화했다.

## 주요 기능

- **목표 설정** — 최종 목표 1개 + 하위 목표 다중(AI 추천 + 직접 추가). 하위 목표가 곧 피드백의 category다.
- **Loopie 작성 모드** — 상황을 말하면 후속 질문으로 근본 원인을 파고들고, Takeaway 2~3개와 함께 title·category·importance·tags를 정리해 피드백 1건을 제안한다.
- **Loopie 회고 모드** — 전체 피드백을 컨텍스트로 지난 다짐을 되짚고, 내재화 여부·Takeaway done·다짐 문구 수정을 제안한다.
- **확인 후 커밋** — Loopie는 DB를 직접 바꾸지 않는다. Edge Function은 `proposal`만 반환하고, 사용자가 확인 칩을 눌러야 반영된다.
- **응답 스트리밍** — SSE로 토큰 단위 표시, 스트리밍이 안 되면 JSON으로 폴백.
- **피드백 CRUD · 인사이트** — 목록/상세/직접 작성, 내재화율·Takeaway 실행률 중심 대시보드.
- **계정** — 이메일 확인 딥링크 인증, 이름 변경, 계정 삭제(연쇄 삭제로 사용자 데이터 제거).
- **한/영 i18n** — 자체 경량 i18n, 문자열은 `translations.ts`에 집중.
- **Google Play 정책 대응** — 인앱 개인정보처리방침·이용약관, 가입 동의 고지, AI 생성 고지, Loopie 답변 길게 눌러 신고.

## 구현하며 다룬 문제

- **Edge Function 런타임 특성** — 프롬프트를 `.md`로 두고 `readTextFile`로 읽으면 edge-runtime이 번들하지 않아 `path not found`가 났다. 프롬프트를 import되는 TS 모듈로 바꿨다. `getUser()`도 세션이 없는 함수 안에서는 null이라 헤더 토큰을 명시적으로 넘겼다.
- **RLS와 GRANT는 별개** — RLS 정책만 정의했더니 운영 프로젝트에서 anon/authenticated 역할에 테이블 권한이 없어 PostgREST가 `42501`로 거절했다. `grant_api_roles` 마이그레이션으로 해결했다.
- **Gemini SSE의 CRLF** — SSE 파서가 `\n\n`만 이벤트 경계로 봐서 Gemini(`\r\n\r\n`) 응답을 한 건도 못 잘랐다. 경계를 CRLF/LF 모두 처리하도록 고쳤다.
- **모노레포 의존성 중복** — `@loop/ui`의 peer `*` 때문에 react-native가 두 버전 설치돼 타입 정체성이 갈렸다. 루트 `overrides`로 고정하고 클린 설치했다.
- **웹 배포 이슈** — SPA 폴백 404, 탭 전환이 전체 문서 로드를 일으키던 문제, 전환 깜빡임, 로그인 직후 빈 목록 등. 별도 글([Vercel에 Expo 웹 배포하며 밟은 문제들](/post/vercel-spa-fallback))로 정리했다.
- 서버리스 구성 전반은 [상시 서버 없이 앱 만들기](/post/expo-supabase-serverless)에 정리했다.

## 현재 상태

진행 중이다. MVP 클라이언트, Loopie 엔진(어댑터·스트리밍), 디자인 시스템 분리, Play 정책 인앱 대응, 웹(PWA) 배포까지 완료됐다. 저장소 기준 남은 작업은 다음과 같다.

- 모노레포 전환 후 `eas build --profile preview`로 워크스페이스 빌드 검증
- Play 제출 잔여 작업(호스팅 DB에 신고 테이블 마이그레이션 적용, Data safety 폼, 법무 검토)
- 리마인더/푸시, 다크 모드, 음성 입력, 검색/필터
- 테스트 러너(jest-expo) 도입

## Links

- GitHub: [wndgur2/loop](https://github.com/wndgur2/loop)
- Web: [loop-green-omega.vercel.app](https://loop-green-omega.vercel.app)
