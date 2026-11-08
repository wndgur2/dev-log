---
category: Project
title: Find The Octopus
description: 오징어 마을에 숨어든 문어를 그림과 추리로 찾아내는 웹 기반 멀티플레이어 라이어 게임이다.
date_started: 2025.11.05
date_finished:
head_count: 2
role: Full-stack
tags: React, TypeScript, WebSocket, Zustand, react-i18next, Tailwind CSS, PWA
thumbnail: /images/octopus.jpeg
---

> 임시 게시글: GitHub 기록을 바탕으로 작성한 초안이며, 이후 다듬을 예정이다.

<img alt="Image" src="https://github.com/user-attachments/assets/f6693d95-8245-49e2-b41b-991614701f63" />

## 개요

오징어 마을에 숨어든 문어를 찾아내는 **멀티플레이어 그림/추리 게임**이다.  
플레이어는 오징어 또는 문어 역할을 맡는다. 오징어는 제시어를 그림으로 표현하고, 문어는 그림을 보고 제시어를 추측하며 정체를 숨긴다.  
라운드 진행, 투표, 결과 집계는 WebSocket으로 모든 플레이어에게 동기화된다.

> 이 저장소는 프론트엔드 코드다. 서버는 별도 API/소켓 도메인으로 분리되어 있다.

## 사용 기술

- **Frontend**: React 19, TypeScript, Vite
- **State**: Zustand(`persist`), React Query
- **Routing**: React Router
- **Styling**: Tailwind CSS, tailwind-merge
- **Realtime**: 브라우저 기본 `WebSocket`
- **i18n**: react-i18next (영어, 한국어)
- **Deploy**: Docker(nginx), GitHub Actions, OCI Load Balancer 기반 blue-green 전환

## 구조/아키텍처

```text
src/
├─ apis/              # 소켓 메시지 전송 훅 (useMutation)
├─ context/           # Asset, Socket, Sound, Toast, Window Provider
├─ hooks/
│  ├─ socketHandlers/ # chat, error, game, room, round 핸들러
│  ├─ useSocketConnection.ts
│  └─ useRouteByPhase.ts
├─ pages/phase/       # Keyword, Drawing, Discussion, Voting, VoteResult, Guessing, RoundResult, GameResult
├─ store/             # gameStore, roomStore, roundStore, userStore (Zustand)
└─ locales/           # en.json, ko.json
```

- 서버와는 `{ mainType, subType, data }` 형태의 JSON 메시지를 주고받는다. `apis/`의 훅은 HTTP 대신 이 소켓 메시지를 보내는 얇은 래퍼다.
- 서버에서 받은 메시지는 `type`별 핸들러 맵으로 분기한다. 처음엔 소켓 연결 코드에 함께 있던 핸들러를 도메인별 파일로 분리했다.
- 게임 phase가 바뀌면 `useRouteByPhase`가 해당 phase 페이지로 라우팅한다.

## 주요 기능

### 게임 흐름

1. 랜덤 방 또는 방 코드로 입장, 라운드 수/드로잉 시간/문어 수/공개 여부/사용자 제시어 사용 여부 설정
2. 역할과 제시어 확인
3. 차례대로 캔버스에 그림 그리기
4. 토론
5. 투표 (동점이면 재투표, 다시 동점이면 문어 승리)
6. 투표 결과(문어 정체) 공개
7. 문어 추측: 문어가 제시어를 맞히면 문어 팀 승리
8. 라운드 결과와 점수 공개
9. 마지막 라운드가 끝나면 누적 점수로 최종 순위 공개

![라운드 흐름: 역할·제시어 확인, 그림 그리기, 토론, 투표(동점이면 재투표), 투표 결과, 문어 추측, 라운드 결과를 거쳐 다음 라운드나 최종 순위로 간다](/images/posts/octopus/round-flow.svg)
*그림. 한 라운드는 그림 → 토론 → 투표 → 결과 → 문어 추측 순서로 진행되고, 라운드가 남으면 처음으로 돌아간다.*

### 커밋 기록에서 확인되는 추가 기능

- **재투표**: 서버가 `revote` 시스템 메시지를 보내면 `roundStore`의 재투표 상태를 켜고, 토스트와 시스템 채팅으로 알린다.
- **사용자 제시어(custom keyword)**: 플레이어가 제시어를 등록하고 투표한다. 최소 득표 수(`customKeywordMinVotes`) 이상인 단어만 게임에 쓰인다. 등록 단어 삭제도 가능하다.
- **Fool Mode**: 방 설정에 Fool Mode 옵션을 추가했다. 제시어가 빈 값이면 화면에 "당신은 문어입니다"를 보여준다.
- **다국어**: react-i18next로 영어/한국어를 지원한다. 방에 들어가면 방 설정의 언어로 UI 언어를 맞춘다.
- **볼륨 조절**: 음악과 효과음 볼륨을 따로 range slider로 조절한다. 설정 버튼 영역 너비에 따라 slider를 가로/세로로 바꾼다.
- **플레이어 추방**: 플레이어 목록에서 `kick_player`를 보내고, 추방된 쪽은 `kicked` 메시지를 받아 방을 나간다.
- **PWA**: `manifest.json`을 추가해 fullscreen 모드로 설치할 수 있게 했다.
- **기타**: 전체 화면 토글(미지원 기기는 토스트로 안내), 아바타 생성기, 재로그인, 아이콘 버튼 `aria-label` 보강.

## 구현하며 다룬 문제

### 에셋 로딩 방식 개선

처음에는 이미지, 배경, 사운드를 `for ... await`로 하나씩 순서대로 불러왔다.  
2026.02.05에 다음과 같이 바꿨다.

- `loadGroup`으로 그룹 단위 `Promise.all` 병렬 로딩
- 개별 에셋 실패는 `console.error`로 남기고 나머지는 계속 로딩
- 사운드는 첫 클릭/터치(`interacted`) 이후에 따로 로딩
- unmount 시 `cancelled` 플래그로 state 업데이트 차단

```ts
export const loadGroup = async <T>(entries: LoaderEntry<T>[], onItemLoaded?: () => void) => {
  const result: Record<string, T> = {}
  await Promise.all(
    entries.map(async entry => {
      try {
        result[entry.key] = await entry.loader()
      } catch (e) {
        console.error(`Failed to load asset: ${entry.key}`, e)
      } finally {
        onItemLoaded?.()
      }
    }),
  )
  return result
}
```

### 소켓 연결 안정화

- 연결 코드와 메시지 핸들러를 분리하고, 기존 이벤트 리스너를 제거하도록 정리했다.
- `RoomLayout`의 무한 navigation 루프를 고쳤다.
- 상태를 Zustand로 옮기고, `localStorage` 직접 접근 대신 `persist`를 쓰도록 바꿨다.

### 배포

- PR마다 build CI를 돌린다.
- 운영 배포는 ARM64 Docker 이미지를 빌드한 뒤, OCI Load Balancer routing policy를 바꿔 blue/green 세트를 전환한다.
- 배포 워크플로는 커밋 기록상 팀원이 구성했다.

## Links

- Service: [https://find-octopus.com](https://find-octopus.com)
- GitHub: [https://github.com/wndgur2/octopus](https://github.com/wndgur2/octopus)
