---
category: Study
title: Vercel에 Expo 웹 배포하며 밟은 문제들
date_started: 2026.08.01
tags: vercel, spa, expo-router, react-native-web, pwa, service-worker, webfont, tanstack-query
---

> 임시 게시글: GitHub 기록을 바탕으로 작성한 초안이며, 이후 다듬을 예정이다.

> [Loop](https://github.com/wndgur2/loop)의 Expo 앱을 `react-native-web`으로 export해 Vercel에 올리면서 이틀(2026.08.01~02) 동안 고친 문제들을 원인 → 수정 순서로 정리했다.

## 0. 배포 구성

`app.json`의 `web.output: "static"`이라 정적 라우트는 HTML로 프리렌더된다. 동적 라우트(`/feedback/[id]`, `/chat/[mode]` 등)는 catch-all rewrite로 받아서 expo-router가 클라이언트에서 라우팅한다. Vercel은 파일시스템을 먼저 확인하므로 정적 라우트는 프리렌더 HTML이 그대로 나간다.

## 1. 동적 라우트 404 — cleanUrls와 rewrite destination

### 증상

```
/sign-in              → 200
/feedback/abc-123     → 404
```

### 원인

`cleanUrls: true`는 `.html` URL을 확장자 없는 경로로 **리다이렉트**한다. rewrite destination을 `/index.html`로 두면 이 리다이렉트와 물려 폴백이 성립하지 않는다. Vercel 문서에도 "If cleanUrls is true, use `/` instead of `/index.html`"라고 나와 있다.

### 수정

```diff
- "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
+ "rewrites": [{ "source": "/(.*)", "destination": "/" }],
```

### 배운 점

로컬 검증을 `npx serve -s`로 했는데, 이 서버는 cleanUrls 개념이 없어 그냥 index.html로 폴백한다. 그래서 로컬에선 통과하고 Vercel에서만 깨졌다. **호스팅 라우팅은 실제 배포본에서 확인해야 한다.** 같은 맥락에서, `vercel.json`은 스키마가 엄격해서 `_comment` 같은 모르는 키가 있으면 빌드 전에 배포가 실패한다.

## 2. PWA — 서비스워커는 최소한으로

Chrome은 **fetch 핸들러가 있는 서비스워커**가 등록돼 있어야 설치 프롬프트를 띄운다. 그래서 워커는 필요하지만 역할을 일부러 좁혔다.

- **캐시함**: `/_expo/**`만. 파일명에 콘텐츠 해시가 있어 빌드마다 바뀌므로 낡을 수 없다.
- **캐시 안 함**: HTML, API 응답. 앱 셸을 캐시하면 사용자가 낡은 빌드에 묶이고, 어차피 Supabase 없이는 동작하지 않아 오프라인 지원은 의미가 없다.

```js
const isImmutableAsset = (url) =>
  url.origin === self.location.origin && url.pathname.startsWith('/_expo/');

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!isImmutableAsset(url)) return; // navigations, API → network
  // cache-first for hashed bundles
});
```

manifest 링크, theme-color, iOS 메타, 워커 등록은 웹 전용 HTML 셸인 `+html.tsx`에 넣었다. 이 파일은 네이티브 번들에 포함되지 않는다.

## 3. 화면 전환 깜빡임

PWA에서 화면 전환 때 깜빡인다는 제보가 있었다.

### 원인 1 — 배경을 칠하는 레이어가 없었다

`#root`부터 6단계 아래까지 computed background를 찍어보니 전부 `rgba(0,0,0,0)`였다. 처음 불투명해지는 곳은 `Stack`의 `contentStyle`이었다. 그래서 전환 애니메이션 중 화면 겹침이 어긋나는 프레임마다 브라우저 기본 흰색이 비쳤다. standalone PWA는 브라우저 크롬이 없어 화면 전체가 번쩍인다.

→ `html`, `body`, `#root`에 캔버스 색을 깔았다. 값은 하드코딩하지 않고 토큰(`LoopColors.canvas`)을 import했다. 처음에는 아이콘 배경색을 캔버스로 착각해 넣었는데, 그러면 흰색 깜빡임이 베이지색 깜빡임으로 바뀔 뿐이다.

```ts
const BASE_CSS = `html, body, #root { background-color: ${LoopColors.canvas}; }`;
```

### 원인 2 — 폰트 7.8MB를 기다리며 아무것도 안 그렸다

웹도 네이티브처럼 `expo-font`로 TTF를 로드했고, 루트 레이아웃이 로딩이 끝날 때까지 `null`을 반환했다. 네이티브는 스플래시가 가려주니 맞는 방식이지만, 웹에서는 빈 화면이다. PWA는 `start_url`이 매번 새 문서 로드라 열 때마다 이 구간을 지난다.

→ 플랫폼 확장자로 갈랐다. Metro는 웹 번들에서 `fonts.web.ts`를 우선 선택한다.

| | 네이티브 `fonts.ts` | 웹 `fonts.web.ts` |
|---|---|---|
| 로딩 | `useFonts()` + TTF | CSS `@font-face` + WOFF2 |
| 렌더 게이트 | 있음 | 없음 (즉시 `[true, null]`) |

웹은 require하지 않으니 TTF가 번들에서 아예 빠진다. `font-display: swap` + preload로 폴백 글꼴이 먼저 보이고 나중에 교체된다.

### 원인 3 — 폰트 크기

`pyftsubset --flavor=woff2`로 서브셋 + 변환해 **7.8MB → 1.8MB**로 줄였다. 사용자가 임의의 한국어를 입력하므로 상용 2,350자가 아니라 **Hangul Syllables 전체(U+AC00–D7A3, 11,172자)** 를 남겼다. `/fonts/`에는 1주 캐시 헤더를 붙였다(파일명에 해시가 없어 immutable은 쓰지 않았다).

## 4. 탭 전환이 전체 문서 로드였다

### 증거

화면 녹화를 프레임 단위로 보니, 탭을 누르는 순간 주소창 새로고침 버튼이 정지(✕)로 바뀌었다. 클라이언트 라우팅이라면 나올 수 없는 상태다.

### 원인

react-navigation은 탭 버튼에 `href`를 넘기고, react-native-web은 `href`가 있으면 진짜 `<a>`를 렌더한다. 기본 버튼인 `PlatformPressable`은 웹에서 `preventDefault()`를 호출한 뒤 `onPress`로 클라이언트 라우팅을 한다. 그런데 커스텀 탭 버튼(스쿼시 애니메이션)이 이를 평범한 `Pressable`로 바꾸면서 `href`는 넘기고 `preventDefault`는 안 했다. 그래서 클릭할 때마다 브라우저가 링크를 따라가 문서를 다시 로드했다.

이게 그동안 보이던 증상(탭마다 스켈레톤 재등장, 진입 애니메이션 재생, "0.3초 뒤 새로고침되는 느낌")의 근원이었다.

### 수정

```diff
- <Pressable {...rest} ...>
+ <PlatformPressable {...rest} pressOpacity={1} pressColor="transparent" ...>
```

앵커 처리 로직을 직접 복제하지 않고 라이브러리 컴포넌트를 그대로 써서 ⌘-클릭 새 탭 열기도 유지된다. 앞서 "페이지에 `<a>`가 0개"라고 확인했던 건 탭바가 없는 로그인 화면에서 잰 것이라 틀린 근거였다.

## 5. 로그인 직후 빈 목록 — 세션 가드 + 캐시 폐기

### 원인

루트 게이트는 세션이 `null`이어도 `Stack`을 렌더하고, `/sign-in` 리다이렉트는 effect라 한 프레임 늦다. 그 사이 탭 화면이 마운트돼 **세션 없이** 쿼리를 날렸다. Supabase는 여기서 에러를 내지 않는다. RLS가 매칭되는 행이 없어 `[]`를 돌려주고, TanStack Query는 이를 정상적인 빈 결과로 캐시한다. 로그인 후에도 키에 데이터가 있으니 다시 가져오지 않는다.

이 버그는 원래 있었는데, 탭마다 문서가 새로 로드되면서 캐시가 날아가 우연히 가려지고 있었다. 4번을 고치자 드러났다.

### 수정 1 — 세션 가드

```ts
export function useIsSignedIn(): boolean {
  return !!useAuth().session;
}

useQuery({ queryKey: qk.feedbacks, enabled: useIsSignedIn(), ... });
```

### 수정 2 — 계정이 바뀌면 캐시 폐기

작업 중 로그아웃해도 쿼리 캐시가 남아 있는 걸 발견했다. 같은 기기에서 다음 사람이 로그인하면 이전 사용자의 피드백을 잠깐 볼 수 있었다.

```ts
supabase.auth.onAuthStateChange((_event, next) => {
  const nextUserId = next?.user?.id;
  if (userIdRef.current && userIdRef.current !== nextUserId) queryClient.clear();
  userIdRef.current = nextUserId;
  setSession(next);
});
```

빌드본에서 로그아웃 상태로 `/`에 진입했을 때 RLS 대상 REST 호출이 0건인 걸 확인했다.

## 정리

- `cleanUrls`를 쓰면 SPA 폴백 destination은 `/`로 둔다. 로컬 정적 서버로 호스팅 라우팅을 검증하지 않는다.
- 서비스워커는 해시된 자산만 캐시하고 HTML은 항상 네트워크로 보낸다.
- 배경이 비는 레이어가 있으면 전환 중 브라우저 흰색이 비친다. 색은 토큰에서 가져온다.
- 웹에서 폰트 로딩으로 렌더를 막지 않는다. `.web.ts` 플랫폼 분기와 서브셋 WOFF2를 쓴다.
- RLS는 세션 없는 쿼리에 에러 대신 `[]`를 준다. 쿼리를 세션으로 가드하고, 계정이 바뀌면 캐시를 비운다.
- 한 버그가 다른 버그를 가리고 있을 수 있다. 하나를 고친 뒤 새로 드러나는 증상을 의심해야 한다.
