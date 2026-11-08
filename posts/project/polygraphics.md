---
category: Project
title: PolyGraphics
description: 게임의 그림과 소리를 선언형 JSON 문서로 쓰고, design token에 맞춰 결정적으로 렌더링하는 AI 친화적 절차적 에셋 시스템이다.
date_started: 2026.08.15
date_finished:
head_count: 1
role: Tooling · Game art · Sound
tags: procedural-asset, design-token, svg, json-schema, phaser, godot, webaudio, typescript, zod
thumbnail: /images/polygraphics.jpeg
---

> 임시 게시글: GitHub 기록을 바탕으로 작성한 초안이며, 이후 다듬을 예정이다.

## 개요

**AI-legible procedural asset system.** 게임 비주얼과 사운드를 선언형 JSON 문서로 적고, design token 세트에 맞춰 결정적으로(deterministic) 렌더링하는 시스템이다.

핵심 문장은 하나다. **에셋은 읽고, diff하고, 패치하고, 검증하고, 따로 떼어 렌더링할 수 있는 데이터다.**

![PolyGraphics 갤러리의 실제 에셋들](/images/posts/polygraphics/showcase.png)
*그림. 갤러리에 있는 실제 에셋들. 캐릭터, 적, 투사체, 픽업, 아이콘, 유물, 물약 모두 JSON 문서에서 렌더링된 것이다.*

### 왜 만들었나

시작은 도형 아트로 만든 게임 두 개를 감사(audit)한 기록(`docs/reference-analysis.md`)이다. 두 게임 모두 그림이 명령형 그리기 코드로만 존재했고, 같은 한계에 부딪혔다.

- **그림에 직렬화된 표현이 없다.** 적 데이터에는 텍스처 키나 색 하나만 있고, 생김새는 부트 코드 어딘가의 이름 없는 블록이다.
- **design token이 없다.** 한쪽은 서로 다른 색 리터럴이 `0x` 68개, `'#'` 23개 흩어져 있는데 이름 붙은 색은 단 하나였고, 다른 쪽은 `ff9b3d`와 `ff9d3c`처럼 실수로 갈라진 색이 있었다.
- **에셋 하나만 미리 볼 수 없다.** 보스 하나를 보려면 게임을 켜고 5분을 플레이해야 했다.
- **출력이 재현되지 않는다.** 그릴 때 `randf_range`를 써서 스크린샷끼리 비교가 불가능했다.

결론은 "도형이라 싸 보이는 것"이 한계가 아니라 **표현 자체가 읽히지 않는 것**이 한계라는 점이었다. 그래서 PolyGraphics는 같은 시각 언어를 AI가 먼저, 사람이 그다음으로 읽고 다룰 수 있게 만드는 것을 목표로 잡았다. README의 "For AI agents" 절이 말하듯, 주 작성자는 AI 에이전트다.

## 사용 기술

| 영역 | 기술 |
|---|---|
| 코어 | TypeScript, zod (스키마), tsx |
| 렌더링 | 자체 SVG 렌더러, `@resvg/resvg-js` (PNG 래스터화), pngjs |
| 사운드 | 자체 오프라인 렌더러 (WAV), WebAudio 어댑터 |
| 엔진 어댑터 | Phaser (TS 파일 하나), Godot (GDScript 파일 하나) |
| 생성 스크립트 | Python (리그·forward kinematics·IK로 몸체 문서 생성) |
| 배포 | Vercel (갤러리 정적 사이트, PR마다 프리뷰), GitHub git dependency (패키지) |

## 구조

```
authoring documents (JSON + tokens + themes)
        │  validate · lint
        ▼
compiled IR   토큰 → [r,g,b,a], variant 적용, use 인라인, repeat 전개
        │
        ├─▶ SVG / gallery.html   사람과 AI가 보고 고치는 곳
        ├─▶ PNG / WAV bake       회귀 테스트 baseline
        ├─▶ dist/<app>/*.json    게임이 import하는 번들
        └─▶ adapters             Phaser · Godot · WebAudio (단순 해석기)
```

![에셋 문서와 토큰이 lint와 컴파일을 거쳐 IR이 되고, SVG·bake·번들·어댑터로 나가는 흐름](/images/posts/polygraphics/pipeline.svg)
*그림. 문서와 토큰은 검증을 거쳐 하나의 IR로 컴파일되고, 갤러리·회귀 테스트·게임 번들·엔진 어댑터가 모두 그 IR을 쓴다.*

```
tokens/base.json        모든 앱이 공유하는 물리량: 램프, 선 굵기, 알파, 오디오 사다리
apps/<id>/app.json      앱 매니페스트: 전제, 카테고리, 그리고 check가 강제하는 RULES
apps/<id>/tokens.json   앱 팔레트, 그리드, 레이어, 피치 팔레트, 라우드니스 패밀리
apps/<id>/assets/       에셋 문서 (id = <app>.<category>.<name>)
apps/<id>/sounds/       사운드 문서
apps/<id>/baselines/    승인된 PNG·WAV
adapters/               phaser · godot · webaudio
src/                    schema · token resolver · SVG renderer · compiler · lint · rules · gallery · sound
```

**app**은 번들을 소비하는 단위(게임 하나, 런처 하나)다. 문법(스키마, 도형, 렌더러, 어댑터)은 레포가 소유하고, 앱은 그 문법을 좁힐 수만 있고 넓힐 수는 없다. 현재 `apps/`에는 `ss`(The Feelers), `demo`(예제), `playmore`가 있다.

## 주요 기능

### 에셋 문서

에셋은 이름 붙은 `parts`(배열 순서 = 그리는 순서), 선언형 `variants`(패치), 키프레임 `animations`로 이뤄진다. `description`은 필수다. 다른 문서를 `use`로 합성할 수 있어서, 예를 들어 무기 아이콘이 자기 투사체 문서를 그대로 품는다. 원래 게임에서 같은 모양을 두 번 손으로 그리던 문제가 구조적으로 사라졌다.

### Design token과 theme

색은 값이 아니라 `$blood`, `$blood.dark`, `$blood@soft` 같은 토큰 참조로만 칠한다. raw `#hex`는 렌더링은 되지만 가장 가까운 토큰을 알려주며 경고한다. theme은 토큰 오버레이일 뿐이라, `ice.json` 하나로 로스터 전체의 색이 바뀌고 실루엣은 그대로다.

### 결정적 렌더링과 회귀 테스트

seed를 쓰는 PRNG와 벽시계 없는 렌더링 덕분에 같은 입력이면 출력이 바이트 단위로 같다. 그래서 `npm run regress`가 PNG·WAV를 baseline과 바이트 비교할 수 있다. 자세한 내용은 별도 글에 정리했다.

### Lint와 앱 규칙

`npm run check` 하나로 검증·렌더·갤러리·매니페스트를 만든다. 오타 토큰에는 "did you mean"식 제안이 붙고, 아무도 안 쓰는 토큰은 dead로 보고한다. 앱 매니페스트의 `rules`(그리드, 크기, 필수 clip, ΔE2000 색 거리, 게임이 의존하는 geometry contract 등)를 check가 읽어 경고나 에러로 강제한다. 규칙을 일부러 벗어날 때는 문서에 `why`로 이유를 적는다.

### 갤러리와 디자인 루프

갤러리는 카테고리 탭, 검색, 에셋별 상세 페이지를 갖는다. 상세 페이지에서는 크게, 실제 바닥색 위에서, 실루엣으로 볼 수 있고 parts 목록과 **copy brief**(채팅에 붙여넣을 요약)를 제공한다. `npm run watch`는 저장할 때마다 다시 빌드하고 페이지를 새로고침한다. 그 밖에 `inspect`, `sheet`(프레임별 포즈), `filmstrip`(일회성 clip을 프레임으로), `motion`(게임 배율에서 실루엣이 몇 px 움직이는지), `readability`(바닥 대비 명암비) 스크립트가 있다.

### 엔진 어댑터

어댑터는 IR을 해석만 하는 파일 하나다. 토큰·문법·PRNG 로직은 게임에 실리지 않는다. Phaser는 `bakeFlat`(텍스처 하나), `buildRig`(파트별 애니메이션), `drawAsset`(매 프레임 지오메트리로 다시 그림)을 제공하고, Godot은 `build`/`play`로 Node2D 트리와 Tween을 만든다. 각각 mock scene 테스트와 headless Godot 테스트로 검증한다.

### 사운드

사운드도 같은 문법으로 다룬다. "공간 대신 시간"을 쓴 에셋 문서이고, 피치 팔레트·라우드니스 패밀리·WebAudio 어댑터를 갖는다. 별도 글에 정리했다.

### 패키지 배포

게임은 `"polygraphics": "github:wndgur2/polygraphics"`로 의존하고 `polygraphics/phaser`, `polygraphics/apps/<id>/assets` 등을 import한다. `dist/`와 어댑터가 커밋돼 있어서 설치 시 빌드 단계가 없다. 은퇴한 그림은 지우지 않고 `archived` 태그를 붙여 번들에서만 뺀다. 이 과정에서 "게임이 먼저, 그림은 나중"이라는 순서를 커밋 기록으로 배웠다.

## 현재 상태

진행 중이다. 2026.08.15 첫 커밋 이후 패키지화(08.22), 사운드 도입(08.31), 사운드 품질 도구(09.08), 앱별 디자인 시스템(09.20), clip 모델 확장(10.05)이 들어갔다. README 로드맵에 남은 항목은 다음과 같다.

- `src/` 수정 없이 두 번째 실제 앱 붙이기, 게임이 앱별 번들로 옮긴 뒤 union 번들 제거
- 사운드를 패밀리 단위로 다시 쓰기(listening 기록과 함께), Godot용 사운드 경로, 적응형 음악의 재료
- `repeat` scatter의 인스턴스별 motion vector, 어댑터의 gradient 지원

## 링크

- Repo: [wndgur2/PolyGraphics](https://github.com/wndgur2/PolyGraphics)
- Gallery: [poly-graphics.vercel.app](https://poly-graphics.vercel.app)
