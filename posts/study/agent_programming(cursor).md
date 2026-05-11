---
category: Study
title: Cursor 활용
date_started: 2026.05.11
date_updated: 2026.05.11
tags: 
---

Cursor 활용 정리 문서

> 이 문서는 Cursor을 사용하며 얻은 Agentic Programming 노하우를 작성하며, 인사이트 혹은 변경 사항이 있을 때마다 업데이트할 예정입니다.  
> 하루가 다르게 변화하는 내용이라 수정이 많을 수 있습니다. (수정 시 날짜 표기)  

## 전제

### 1. 코딩을 위한 범용 Agent Harness는 Cursor에게 전임한다.  

### 2. 우리가 해야하는 일은
  - Cursor에게 프로젝트의 목표(tommorrow)와 현재 상태(today)를 인지시키는 것
  - Cursor의 Outcome을 검수하는 것
  - Cursor의 Outcome을 내가 follow up하는 것

## Cursor 이해하기

1. [Cursor.com/docs](https://cursor.com/docs)

우리는 Cursor가 내부에서 Agent를 어떻게 다루는지 알 수가 없으니, 이를 잘 활용할 수 있게 제공하는 Cursor 팀의 팁을 잘 따르자. 빠르게 업데이트 되니 주기적으로 [Cursor.com/changelog](https://cursor.com/changelog)도 확인하는 것이 좋다. (IDE update 알림이 뜨니 크게 신경쓰지 않아도 보게 된다.)

프롬프팅, 모드와 같은 기본기부터 rule, skill, subagent 등 커스터마이징까지 이를 어떻게 활용하면 좋은지 명시되어있다.
특히 흔히 하는 실수(what to avoid)가 명시되어있어 agent의 성능을 떨어뜨리는 실수를 방지할 수 있다.

 *(ex, cursor rule은 매 세션에 주입되는 프롬프트로, 그 필요가 확실한 경우에 사용하며 간결하고 명료하게 작성해야 한다.)*

생각보다 양이 많지 않고 명료하게 작성되어 있어 정독하기 수월했다.

2. [cursor-team-kit](https://cursor.com/en-US/marketplace/cursor/cursor-team-kit) 플러그인 활용

Cursor 팀에서 사용하는 skill, rule, subagent를 모아놓은 Plugin이다. 실제로 유용하기도 하고 사용하다보면 기능별 프롬프팅 Best Practice를 지속적으로 tracking하기 좋을 것이라 생각한다.

플러그인의 업데이트 주기는 [cursor-team-kit Github](https://github.com/cursor/plugins/commits/d1cdb88a9eb33cf392395c87e3fd76419fc1010e/cursor-team-kit)를 보면 알 수 있었는데, 약 1~2개월마다 업데이트되는 걸 보니 Cursor 업데이트에 따른 개선이 적용되는 것 같다.

## Cursor에게 프로젝트의 목표(tommorrow)와 현재 상태(today)를 인지시키기

