---
category: Study
title: Page Speed Insight (1) - Performance (진행중)
date_started: 2026.04.07
date_updated: 2026.04.07
tags: lighthouse, PSI, FCP, LCP, CLS, TBT
---

> 최근 호기심에 [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview?hl=ko)를 이용해 내 블로그의 성능을 확인해보았다.  
> 결과, Performance 점수가 특히 좋지 않아, 이를 개선하는 과정을 남겨보았다.  

## 1.1 개선 전 Lightouhse 측정 결과

<img width="1602"  alt="Image" src="https://github.com/user-attachments/assets/2945b20d-53af-451c-8947-36390adc9018" />

|항목|점수|
|---|---|  
| Performance | 42 |  
| Accesibility | 74 |  
| Best Practice | 96 |  
| SEO | 100 |  

> M4 Air 16GB, 인터넷 속도 160Mbps 환경에서 측정했다.

## 1.2 Performance 평가 분석

세부 성능 평가 결과는 다음과 같다. (Green: 빠름, Orange: 보통, Red: 느림)

| 평가 항목 | 결과 |
|---|---|
|콘텐츠가 포함된 첫 페인트 (First Contentful Paint) | `Green` 0.8s |
|콘텐츠가 포함된 최대 페인트 (Largest Contentful Paint) | `Red` 4.0s  |
|총 차단 시간 (Total Blocking Time) | `Red` 360ms |
|레이아웃 변경 횟수 (Cumulative Layout Shift) | `Red` 0.511점  |
|속도 지수 (Speed Index) | `Green` 0.9s  |

>  측정법, 기준점 및 개선법 등 자세한 내용은 [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview?hl=ko)에 명시되어 있다.


### 문제점

- LCP : 가장 느린 컨텐츠가 로드되기까지 `3.7s`가 걸렸다.
- TBT : FCP 후, 사용자와 상호작용이 가능하기까지 `350ms`가 걸렸다.
- CLS : 사용자 상호작용 없이, 페이지의 레이아웃이 크게 변경된다.

## 1.2 개선 전략

Lighthouse 보고서에는 친절하게 개선 방안을 중요도 순서로 제안해준다.

### 제안 (Insights)

- `Red` 효율적인 캐시 수명 사용 (예상 절감 용량: 5,001KiB)
- `Red` 이미지 전송 개선 (예상 절감 용량: 4,414KiB)
- `Red` 렌더링 차단 요청 (예상 절감 시간: 210ms)
- `Red` 레이아웃 변경 원인
- `Red` 강제 실행된 리플로우
- `Red` LCP 요청 탐색
- `Red` 네트워크 종속 항목 트리
- `Orange` 최신 HTTP
- DOM 크기 최적화
- LCP 분석
- 서드 파티

### 진단 (Diagnostics)

- `Red` 사용하지 않는 자바스크립트 줄이기 (예상 절감 용량: 675KiB)
- `Orange` img 엘리먼트에 `width` 및 `height`가 명시되어 있지 않음
- `Orange` CSS 축소하기 (예상 절감 용량: 3KiB)
- `Orange` 사용하지 않는 CSS 줄이기 (예상 절감 용량: 16KiB)
- `Orange` 네트워크 페이로드가 커지지 않도록 관리하기 총 크기: 8,041KiB
- 긴 기본 스레드 작업 피하기 (긴 작업 1개 발견)
- 합성되지 않은(non-composited) 애니메이션 지양하기 (애니메이션 요소 9개 발견)

## 1.3 적용

중요도 순서로 개선을 적용했다.

### `Red` 효율적인 캐시 수명 사용 (예상 절감 용량: 5,001KiB)

- 이미지를 깃허브 서버를 사용하기때문에 cache 헤더를 수정할 수 없었다.
- service worker를 통해 cache storage에 직접 저장하는 방법이 있다고 하지만, 굳이 적용하지는 않았다. 그 이유는 아래와 같다.
  1. 캐시 타임을 늘려도 첫 방문자의 경험을 개선하지 못한다.
  2. 가장 많은 네트워크를 잡아먹는 이미지의 경우 압축을 통해 개선이 가능했다.

### `Red` 이미지 전달 개선 ***-3,723KiB***

- jpeg 이미지를 모두 같은 해상도의 webp로 변경했다.
- 리소스 사이즈가 10배 이상 줄었다.

<img alt="Image" src="https://github.com/user-attachments/assets/c4b42a9c-f49d-4b57-a441-a34fdc928df8" />


### Render-blocking requests ***-440ms***

- Google Fonts 패칭을 defer하여 폰트 랜더링 지연을 방지했다.
- *Trade off*: 해당 폰트를 불러오는 동안 fallback font가 표시된다.

<img alt="Image" src="https://github.com/user-attachments/assets/9733a59b-ed6d-4643-b0e0-c46fb8a12e2d" />


### LCP request discovery

- 가장 먼저 표시되어야하는 이미지를 빠르게 로드했다.
- 홈페이지 첫 화면에 나타나는 Project Preview, Profile의 attr를
  `loading:eager`, `fetchPriority:high`로 설정했다.

### Layout shift culprits **0.547 -> 0.001**

- 사용자와 interaction 없이 발생하는 layout shift는 UX에 치명적이다.
- Lighthouse는 레이아웃 변경의 영향 범위, 거리(distance)에 따라 점수를 부여하여 평가한다. (lower is better)
- 고정 height를 사용하고, 이미지 크기를 지정하여 개선했다.

> *https://web.dev/articles/cls?hl=ko*

### Total Reflow Time `- 75ms (100%)`

