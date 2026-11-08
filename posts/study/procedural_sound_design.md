---
category: Study
title: 절차적 사운드 디자인 — 사운드 문서, 피치 팔레트, 귀 대신 측정
date_started: 2026.08.31
tags: webaudio, procedural-audio, sfx, loudness, k-weighting, design-token, game-audio
---

> 임시 게시글: GitHub 기록을 바탕으로 작성한 초안이며, 이후 다듬을 예정이다.

> [PolyGraphics](https://github.com/wndgur2/PolyGraphics)에 사운드를 들인 과정을 정리했다. 그림에 썼던 "에셋 = 데이터" 방식을 효과음에 그대로 적용했고, 작성자(AI 에이전트)가 소리를 들을 수 없다는 문제를 측정으로 메웠다.

## 1. 출발점

게임의 효과음은 `AudioSynth.ts` 안의 거대한 `switch` 하나였다. 매직 넘버투성이에, 마른 균열음(`creak`)은 `Math.random()`이 든 grain 루프라서 회귀 테스트가 불가능했다. 그림이 그리기 코드에 갇혀 있던 것과 똑같은 상태였다.

그래서 같은 처방을 했다. 선언형 문서, 결정적 렌더링, 엔진 중립 IR, 단순한 어댑터.

## 2. 사운드 문서: 공간 대신 시간

스키마는 일부러 에셋 문서와 같은 어휘를 쓴다. 에셋을 쓸 줄 알면 사운드도 쓸 수 있어야 한다는 의도다.

| asset | sound |
|---|---|
| `parts` (그리는 순서) | `voices` (믹스 순서) |
| `shape` | `source` (`osc` / `noise`) |
| `fill` = 토큰 참조 | `gain` = 토큰, `freq` = 피치 팔레트 |
| `at: [x, y]` px | `at: 0.006` 초 |
| `size` | `duration` |
| `repeat` (면적에 scatter) | `repeat` (시간 구간에 grain scatter) |
| `animations.tracks` | `env` |

```jsonc
{
  "id": "ss.sfx.hit",
  "duration": 0.09,
  "meta": { "minInterval": 45 },     // 게임이 지키는 rate limit
  "jitter": { "freq": [0.82, 1.2] }, // 트리거마다 엔진이 굴림
  "voices": [
    { "id": "thump", "dur": "tick", "gain": "soft",
      "source": { "kind": "osc", "wave": "square", "freq": "$tap", "to": "$tap.down" },
      "env": [{ "prop": "gain", "keys": [[0, 1], [1, 0]] }] }
  ]
}
```

`to`는 두 키짜리 glide의 줄임말이고, 컴파일하면 사라진다. rate limit, 패닝, 적응형 음악 같은 "소리 전체의 동작"은 엔진 몫이다. 그림 쪽에서 몸 전체의 회전과 뒤집기를 엔진에 맡긴 것과 같은 경계다.

## 3. 피치 팔레트와 레벨 사다리

**피치도 토큰이다.** `$tap.down`은 `$blood.dark`가 색 램프를 타듯 오디오 램프(`up: 2`, `down: 0.5`)를 탄다. raw Hz는 동작하지만 가장 가까운 토큰을 알려주며 경고한다.

팔레트는 게임 세계관처럼 둘로 나뉜다.

- **몸의 소리**: `$tap`(무기에 맞는 외골격), `$shell`, `$bone`(플레이어의 몸), `$grit`(부서지는 껍질)
- **목소리**: `$tonic $third $fifth $seventh` = A5, C5, E5, G5. 게임 음악이 이미 쓰는 A단조 음계다.

그래서 효과음이 음악과 부딪힐 수 없고, 팡파르는 구조적으로 조성 안에 있다. 원래 코드의 아르페지오는 우연히 C장조였던 float 네 개였다. 인터페이스 전체를 다시 조율하려면 숫자 네 개만 고치면 된다.

음량은 여섯 칸 사다리(`hush faint soft mid loud peak`, 0.07~0.5)에서 고른다. 0.14~0.5 사이에 흩어져 있던 16개의 임의 float를 대체했고, "인터페이스를 조용하게"가 토큰 하나의 일이 됐다.

![hush부터 peak까지 여섯 칸 gain 토큰을 막대로 나타낸 차트](/images/posts/procedural-sound-design/gain-ladder.svg)
*그림. 음량 사다리. 흩어져 있던 임의 float 16개를 여섯 칸 토큰(0.07~0.5)으로 대체했다.*

## 4. 결정성과 두 가지 재생 경로

무작위성은 전부 IR에 실린 seed PRNG다. 벽시계도 없다. 그래서 WAV bake가 매번 바이트 단위로 같고, 그림과 같은 `regress`에 들어간다. 트리거마다 달라지는 `jitter`는 엔진이 굴리고 bake는 무시한다.

```ts
import { play, bake, playBuffer } from "polygraphics/webaudio";

play(ctx, sfxBus, bundle.sounds["ss.sfx.hit"]);            // 라이브 노드 그래프
const buf = await bake(ctx, bundle.sounds["ss.sfx.hit"]);  // 한 번 렌더링해두고
playBuffer(ctx, sfxBus, buf, { rate: 0.82 + Math.random() * 0.38 });  // 싸게 발사
```

자주 울리는 소리는 버퍼, 노드를 쓸 가치가 있는 소리는 라이브 그래프다. 오프라인 WAV까지 세 경로가 하나의 IR을 해석하고, `scripts/test-webaudio-adapter.ts`가 녹음용 mock context로 어댑터를 돌려 envelope 곡선과 노이즈를 렌더러와 샘플 단위로 비교한다.

![사운드 문서가 컴파일되어 IR이 되고, 라이브 그래프·버퍼·오프라인 WAV 세 경로로 재생되는 흐름](/images/posts/procedural-sound-design/playback-paths.svg)
*그림. 사운드 문서는 하나의 IR로 컴파일되고, 라이브 노드 그래프·버퍼·오프라인 WAV 세 경로가 같은 IR을 해석한다.*

## 5. 인스트루먼트 레이어

포팅 후 감사해 보니 두 가지가 걸렸다.

- **`use` 보이스에 pitch가 없었다.** 라이브러리 음을 다른 음높이로 쓰려면 악기 문서에 degree variant를 미리 만들어둬야 했다.
- **envelope가 비율로만 표현됐다.** 키가 `[0..1, value]`라서 두 배 길게 연주하면 attack도 두 배가 된다. 실제로 `chime`은 두 보이스에 12ms attack을 주려고 `0.017`, `0.013`을 손으로 나눠 적어두고 있었다.

그래서 문서가 `root`(작성된 음높이)를 선언하면 악기가 되고, 호출하는 쪽이 `"pitch": "$fifth"`로 음을 고르게 했다. attack은 `adsr`로 초 단위로 적고, 보이스의 최종 길이가 정해진 뒤 키로 풀린다. 이 순서를 위해 pitch·stretch 배율을 결과 위에 덧곱하던 방식을 재귀 안으로 내렸다.

같은 방식으로 `phrase`(악기 하나를 음 목록대로 연주), `unison`(디튠 복제), `echo`(탭을 보이스로 펼침), `takes`(seed를 바꿔 여러 번 굽기)를 추가했다. 전부 컴파일 단계에서 평범한 보이스로 풀리기 때문에 IR 포맷(`polygraphics-sounds@1`)과 어댑터는 그대로다. 레벨업은 이제 보이스 하나다.

```jsonc
{ "id": "climb", "gain": 0.5,
  "phrase": { "use": "ss.lib.note", "step": 0.09,
              "notes": ["$third", "$fifth", "$seventh", "$third.up"] } }
```

반대로 일부러 안 만든 것도 있다. IR 보이스에 sustain과 note-off를 넣으면 길이 없는 보이스가 생기고, 그러면 bake가 불가능해진다. "bake에서 들은 것 = 엔진이 재생하는 것"이라는 보장을 지키려고 이 제약은 받아들인 비용으로 기록했다.

## 6. 귀 대신 측정

에이전트는 자기가 쓴 소리를 들을 수 없다. 그래서 bake가 계측기를 겸하고, `npm run check`가 측정값으로 lint한다.

- **loudness**: K-weighted(ITU-R BS.1770). 캔버스 전체가 아니라 소리가 나는 구간만 잰다. 일찍 끝나는 소리는 짧은 것이지 작은 게 아니다.
- **family band**: 토큰의 `audio.loudness`가 anchor(−24)와 패밀리별 오프셋을 갖는다. `field` +6, `player` +3, `fanfare` +2, `impact` −3, `interface` −4 같은 식이고, ±4dB를 벗어나면 경고한다.
- **phone**: 가장 큰 50ms를 250Hz highpass + 8kHz lowpass(작은 스피커가 남기는 대역) 전후로 비교한다. 6dB 넘게 빠지면 저음이 소리를 끌고 있다는 뜻이다.
- **true peak**(4배 오버샘플), **attack**(onset에서 peak 90%까지), **필터 없는 square·sawtooth**도 본다.

첫 버전 lint부터 성과가 있었다. `whoosh`가 중앙값보다 17dB 작게 나왔는데, 원본이 노이즈에 오실레이터와 같은 gain 숫자를 주고 넓은 bandpass로 대부분을 버리고 있었기 때문이다. 패밀리 밴드와 phone·attack·필터 lint를 처음 켰을 때는 경고 54개가 나왔고, 그게 그대로 다시 쓰기 작업 목록이 됐다.

규칙을 일부러 벗어나는 문서는 `offBand`에 이유를 적는다. 갤러리에는 스펙트로그램, baseline과 A/B 비교, phone 토글, 음량순으로 세트를 보는 "the set" 탭이 있다. 사람이 들을 때는 `docs/listening.md`의 네 질문(무엇으로 들리나 / 이웃과 어떤가 / burst ×8에서 여러 개로 들리나 기계로 들리나 / 문서의 말로 무엇을 고칠까)에 답해 PR에 남긴다.

## 7. 커밋에서 배운 것

### 자주 울리는 소리는 작아야 한다

- `hit`: 군중 속에서 초당 22번 가까이 울려 싸움에서 가장 큰 소리가 됐다. 문서 전체 gain 0.5로 6dB 내렸다.
- `levelup`: −22.6dB로 팡파르 밴드에 있었지만, 한 판에 한 번 울리는 victory와 달리 후반엔 분당 여러 번 울린다. 6dB 내리고 `offBand`로 이유를 적었다.
- 상자 열기: victory, rattle, burst + levelup이 연달아 울려 폭발처럼 들렸다. `burst`(세트에서 가장 큰 −20.7dB)와 `victory`를 각각 6dB 내렸다.

같은 패밀리라도 **얼마나 자주 듣느냐**가 적정 음량을 바꾼다. 밴드는 출발점이고, 예외는 이유와 함께 적는다.

### pickup은 다섯 번 고쳐졌다

자석 한 번에 수십 개씩 몰려 울리는 소리라서 가장 오래 걸렸다.

1. 필터 없는 square가 raw 1500Hz까지 올라가는 소리 → 쌓이면 소음이었다.
2. triangle + 늦게 들어오는 `glint` sine, jitter 축소, `minInterval` 40 → 75ms → 부드러워졌지만 여전히 스무 개 쌓인 beep처럼 들렸다.
3. 아예 다른 소리로: sine 하나가 한 옥타브 위로 튀는 물방울(330 → 659Hz)
4. 아래로 떨어지는 sine 한 번의 pop, 손으로 쓴 take 네 개. 버퍼 하나를 rate만 바꿔 60번 울려도 결국 한 소리이기 때문이다. (순수 음에는 seed를 바꿀 노이즈가 없어서 `takes` 대신 variant로 작성)
5. take 넷이 서로 너무 달라 하나의 소리로 안 들려서, 크기만 살짝 다른 같은 pop 셋으로 줄였다.
6. 게임 안에서 거의 안 들렸다. 고장이 아니라 **masking**이었다. 에너지의 97%가 `shoot`과 `enemy-die`가 채우는 500Hz~1kHz에 있었다. 한 옥타브 올려 1760 → 880Hz로 떨어지게 하자 99%가 1~2kHz로 옮겨갔다.

교훈은 두 가지다. 대량으로 울리는 소리는 "여러 개"로 들려야지 "기계"로 들리면 안 된다. 그리고 소리는 혼자가 아니라 **같이 울리는 소리들 사이에서** 판단해야 한다.

## 8. 정리

- 사운드도 그림과 같은 문법을 쓰면 배울 것이 하나로 줄고, 같은 도구(토큰, lint, regress, 갤러리)를 그대로 쓴다.
- 편의 문법은 전부 컴파일 단계에서 풀어서 IR과 어댑터를 단순하게 유지한다.
- 들을 수 없으면 잰다. 다만 측정은 대리 지표일 뿐이고, 최종 판단은 들을 수 있는 사람이 한다.
