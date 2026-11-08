---
category: Study
title: 상시 서버 없이 앱 만들기 — Expo + Supabase + Edge Functions
date_started: 2026.06.07
tags: expo, react-native, supabase, postgres, rls, edge-functions, llm, monorepo, eas
---

> 임시 게시글: GitHub 기록을 바탕으로 작성한 초안이며, 이후 다듬을 예정이다.

> [Loop](https://github.com/wndgur2/loop) 프로젝트를 하면서 정리한 구성이다. 별도의 상시 서버 없이 Expo 앱 + Supabase + Edge Functions만으로 LLM 챗봇이 들어간 앱을 만들었다.

## 1. 전체 구성

| 영역 | 선택 |
|---|---|
| 클라이언트 | Expo (React Native) + TypeScript, Expo Router |
| 서버 상태 | TanStack Query |
| 백엔드 | Supabase — Postgres + Auth + RLS |
| 서버 코드 | Supabase Edge Functions (Deno) |
| AI | LLM 어댑터 (Gemini 기본, Anthropic/OpenAI 교체 가능) |

핵심 전제는 두 가지다.

- **일반 CRUD는 클라이언트가 Supabase에 직접 한다.** 권한은 서버 코드가 아니라 DB의 RLS가 지킨다.
- **비밀값이 필요한 일만 Edge Function으로 보낸다.** LLM API 키와 service_role 키는 클라이언트에 절대 두지 않는다.

![CRUD 경로와 Edge Function 경로](/images/posts/expo-supabase-serverless/two-paths.svg)
*그림. CRUD는 RLS를 거쳐 DB로 바로 가고, 비밀값이 필요한 요청만 Edge Function을 거친다.*

## 2. 데이터 모델

```
profiles ──< goals ──< sub_goals
                          ▲ category (NOT NULL)
profiles ──< feedbacks ──< takeaways
profiles ──< chat_sessions ──< chat_messages
```

- `sub_goals`가 곧 피드백의 category다. 고정 enum 없이 사용자별로 동적이고, `feedbacks.sub_goal_id`는 NOT NULL이라 미분류 피드백이 없다.
- 고정 값(`importance`, `session_mode` 등)은 Postgres native enum으로 뒀다.
- `feedbacks.sub_goal_id`는 `on delete restrict` — 연결된 피드백이 있으면 하위 목표 삭제를 막는다.
- 가입 시 `auth.users` insert 트리거(`SECURITY DEFINER`, `search_path=''`)로 `profiles`를 자동 생성한다.

## 3. RLS — DB가 마지막 방어선

모든 사용자 데이터 테이블에 RLS를 켜고 select/insert/update/delete 정책 4개를 둔다.

```sql
alter table goals enable row level security;

create policy "goals_select_own" on goals
  for select using (user_id = auth.uid());
```

`user_id`가 없는 자식 테이블은 부모를 `EXISTS`로 따라가 소유권을 확인한다.

```sql
create policy "sub_goals_select_own" on sub_goals
  for select using (
    exists (select 1 from goals g
            where g.id = sub_goals.goal_id and g.user_id = auth.uid())
  );
```

로컬에서 Alice의 goal을 Bob이 조회하면 0건, Bob이 Alice 소유로 insert하면 RLS 위반으로 차단되는 걸 확인했다.

### RLS만으로는 부족했다 — GRANT

초기 마이그레이션에는 RLS와 정책만 있고 테이블 GRANT는 Supabase 기본 권한에 맡겼다. 그런데 운영 프로젝트에서는 `anon`/`authenticated` 역할에 테이블 권한이 없어서, **RLS를 평가하기도 전에** PostgREST가 `42501 permission denied`로 거절했다. 온보딩에서 목표 저장부터 실패했다. (가입 시 profile 생성은 `SECURITY DEFINER` 트리거라 영향이 없어서 원인 파악이 늦어졌다.)

```sql
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
```

GRANT는 테이블에 들어갈 자격이고, 어떤 행을 볼지는 여전히 RLS가 정한다. 둘은 별개의 층이다.

![GRANT와 RLS 두 층](/images/posts/expo-supabase-serverless/grant-rls.svg)
*그림. GRANT가 없으면 RLS까지 가지도 못하고 42501로 거절된다.*

## 4. Edge Function — LLM 호출만 서버에서

`chat` 함수 하나가 작성·회고 두 모드를 모두 처리한다. 차이는 시스템 프롬프트와 툴(모드당 1개)뿐이다.

```
요청 JWT로 사용자 확인 → 사용자 스코프 클라이언트로 전체 피드백 로드(RLS 적용)
→ LLM 호출 → 텍스트 + proposal 반환
```

- **사용자 스코프 클라이언트**: 요청 JWT로 Supabase 클라이언트를 만들어 함수 안에서도 RLS가 그대로 걸린다. service_role 키는 쓰지 않는다. (계정 삭제 함수만 예외로 service_role을 쓴다.)
- **확인 후 커밋**: 함수는 DB를 직접 바꾸지 않는다. 툴 호출 결과를 `proposal`로 돌려주고, 클라이언트가 확인 칩으로 동의를 받은 뒤 RLS mutation으로 반영한다.
- **프로바이더 어댑터**: `llm/` 아래에 anthropic/openai/gemini 어댑터를 두고 `LLM_PROVIDER` secret으로 고른다. 호출부는 프로바이더를 모른다.
- **프롬프트 캐싱**: 크고 세션 내에서 안정적인 컨텍스트 블록에 `cache_control: ephemeral`을 붙였다.

![chat 함수의 제안-확인-반영 흐름](/images/posts/expo-supabase-serverless/chat-flow.svg)
*그림. 함수는 `proposal`만 돌려주고, 반영은 사용자가 확인한 뒤 클라이언트가 RLS mutation으로 한다.*

### 런타임에서 잡은 버그 두 개

1. 프롬프트를 `.md`로 두고 `Deno.readTextFile`로 읽었더니 `path not found`. edge-runtime은 import되지 않은 정적 파일을 번들하지 않는다. → 프롬프트를 문자열을 export하는 TS 모듈로 바꿨다.
2. `supabase.auth.getUser()`를 인자 없이 부르면 항상 null. 함수에는 세션이 없기 때문이다. → 헤더의 토큰을 꺼내 `getUser(token)`으로 명시적으로 넘겼다.

### SSE 스트리밍

답변이 끝날 때까지 스피너만 보이는 걸 줄이려고 SSE로 바꿨다. 어댑터 계약을 `AsyncGenerator`로 통일해 텍스트 델타는 바로 흘리고, 툴 입력(부분 JSON)은 끝에서 합쳐 `done` 이벤트로 한 번에 보낸다. 클라이언트는 `supabase.functions.invoke`가 스트리밍 본문을 노출하지 않아 `expo/fetch`로 함수 URL에 직접 POST한다.

로컬에서 Gemini로 돌리니 응답이 아예 안 왔다. 원인은 SSE 이벤트 구분자였다 — Anthropic/OpenAI는 `\n\n`, Gemini는 `\r\n\r\n`을 쓴다. 파서가 LF만 봐서 이벤트를 한 건도 못 잘랐다.

```ts
// event boundary: CRLF and LF both
const BOUNDARY = /\r\n\r\n|\n\n|\r\r/;
```

## 5. 모노레포와 `@loop/ui`

미래의 다른 플랫폼과 디자인 시스템을 공유하려고 npm workspaces로 전환하고, 토큰과 컴포넌트를 `packages/design-system`(`@loop/ui`)으로 분리했다.

- **빌드 스텝 없음**: 패키지는 TS 소스를 그대로 내보내고, 소비 앱의 Metro가 `babel-preset-expo`로 트랜스파일한다.
- **Metro 설정**: `watchFolders`에 모노레포 루트, `nodeModulesPaths`에 앱과 루트를 둔다.
- **도메인 분리**: 패키지는 i18n·쿼리·라우터·앱 alias에 의존하지 않는다. 텍스트는 prop으로 받는다.

문제는 peer dependency였다. `@loop/ui`의 peer를 `*`로 두자 npm이 루트에 react-native **최신** 버전을 따로 깔아서, 앱(0.85.3)과 패키지(0.86.0)가 서로 다른 react-native 타입을 봤다. 루트 `overrides`로 RN 스택 버전을 앱에 고정하고, 증분 설치로는 안 풀려서 `node_modules`와 lock을 지우고 클린 설치했다.

```json
"overrides": {
  "react": "19.2.3",
  "react-native": "0.85.3",
  "react-native-reanimated": "4.3.1"
}
```

## 6. EAS 빌드와 Play 스토어 대응

`eas.json`에 `development`(dev client) / `preview`(내부 배포 APK) / `production`(autoIncrement) 프로필을 두고, `submit.production`은 Play internal 트랙에 draft로 올린다. 서비스 계정 키 파일은 gitignore했다. 모바일 배포는 GitHub Actions에서 수동 실행(`ota` / `build` / `build-and-submit`)으로만 돈다.

Google Play 정책 때문에 앱에 넣은 것들이다.

- **User Data**: 인앱 개인정보처리방침·이용약관, 가입 화면 동의 고지, 공개 계정 삭제 안내 페이지
- **AI-Generated Content**: 채팅에 AI 생성 고지, Loopie 답변을 길게 눌러 신고 → `ai_content_reports` 테이블(RLS, 본인 행만)
- 패키지명을 Play Console 등록값과 맞추려 `com.loop.app` → `com.sam.loop`으로 변경

저장소 기준 아직 남은 일은 모노레포 전환 후 `eas build --profile preview`로 워크스페이스 해석 검증, 호스팅 DB에 신고 테이블 마이그레이션 적용, Data safety 폼 작성이다.

## 정리

- 상시 서버 없이도 **"CRUD는 RLS, 비밀은 Edge Function"** 으로 나누면 백엔드가 꽤 단순해진다.
- 대신 권한 모델이 DB에 있으므로 RLS와 GRANT를 둘 다 챙겨야 하고, 로컬과 운영의 기본 권한 차이를 의심해야 한다.
- edge-runtime, SSE 구분자, 모노레포 의존성처럼 **로컬에서 안 보이는 차이**는 실제 환경에서 돌려봐야 드러났다.
