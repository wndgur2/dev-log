---
category: Study
title: Babel vs ESBuild
date_started: 2024.12.06
date_updated: 2024.12.11
tags: transpiler, browser
---

<img src= 'https://github.com/user-attachments/assets/bfb7cb3b-97a4-473f-9e73-43d522cb27c6'
alt='babel'>

> Babel, esbuild 공식 문서를 정리한 내용입니다.

# Babel이란?

**Babel**은 JavaScript 컴파일러로, 최신 ECMAScript(ES2015+) 코드를 현재 및 이전 브라우저나 환경에서도 실행할 수 있도록 변환해주는 **도구 체인(toolchain)**입니다. 주요 기능과 활용 방법은 아래와 같습니다.

---

## 주요 기능

### 1. 문법 변환 (Transform Syntax)

Babel은 최신 JavaScript 문법을 이전 버전의 JavaScript로 변환합니다. 예를 들어, ES2015의 화살표 함수는 ES5의 일반 함수로 변환됩니다.

```javascript
// Babel 입력: ES2015 화살표 함수
[1, 2, 3].map((n) => n + 1)

// Babel 출력: ES5 등가 코드
[1, 2, 3].map( 
  function (n) {
    return n + 1
  }
)
```

### 2. 폴리필 (Polyfill)

Babel은 타겟 환경에서 지원되지 않는 기능을 동작하도록 하는 폴리필(polyfill)을 지원합니다. 예를 들어, `core-js`와 같은 서드파티 라이브러리를 통해 최신 JavaScript 기능을 사용할 수 있습니다.

### 3. JSX 및 React 지원

Babel은 JSX 문법을 변환할 수 있습니다. React 개발에 필요한 `@babel/preset-react`를 사용하면 JSX 변환을 간단히 설정할 수 있습니다.

설치 방법

```bash
npm install --save-dev @babel/preset-react
```

jsx 예시

```jsx
export default function DiceRoll() {
  const [num, setNum] = React.useState(Math.ceil(Math.random() \* 6));

  const handleClick = () => {
    setNum(Math.ceil(Math.random() \* 6));
  };

  return (
    <div>
      Your dice roll: {num}.
      <button onClick={handleClick}>
        Click to get a new number
      </button>
    </div>
  );
}
```

4.  타입 주석 제거 (Type Annotations)
    Babel은 Flow와 TypeScript의 타입 주석을 제거할 수 있습니다. 다만, 타입 검사 자체는 수행하지 않으므로, 타입 검사를 위해서는 Flow 또는 TypeScript를 별도로 사용해야 합니다.

TypeScript 프리셋 설치

```bash
npm install --save-dev @babel/preset-typescript
```

ts 예시

```typescript
function Greeter(greeting: string) {
  this.greeting = greeting
}
```

5.  플러그인 기반 설계 (Pluggable)
    Babel은 플러그인 기반으로 동작합니다. 다양한 변환을 위한 플러그인을 조합하거나, 직접 플러그인을 작성하여 사용할 수 있습니다.

예시: 간단한 Babel 플러그인

```javascript
// A plugin is just a function
export default function ({ types: t }) {
  return {
    visitor: {
      Identifier(path) {
        const name = path.node.name
        path.node.name = name.split('').reverse().join('')
      },
    },
  }
}
```

6. 디버깅 지원
   Babel은 **소스 맵(source map)**을 지원하여 컴파일된 코드도 디버깅하기 쉽게 만듭니다.

### Babel의 장점

1. **표준 준수**: ECMAScript 표준을 가능한 한 충실히 따릅니다.
2. **경량화**: 불필요한 런타임 종속성을 최소화하여 파일 크기를 줄이고 성능을 높입니다.

### 📝 용어 설명

- **ECMAScript (ES)**: JavaScript의 표준 사양.
- **Compiler (컴파일러)**: 코드를 다른 형태로 변환해주는 프로그램.
- **Syntax (문법)**: 프로그래밍 언어의 구조와 규칙.
- **Polyfill (폴리필)**: 특정 기능이 없는 환경에서도 해당 로직이 작동하도록 도와주는 코드.

Babel은 최신 JavaScript 개발에서 중요한 도구로, 호환성과 확장성을 동시에 제공합니다. ✨

---

<img src= 'https://github.com/user-attachments/assets/d99c5959-815d-46d8-b38d-416d40a62ff8' alt='esbuild' />

# ESBuild란?

ESBuild는 최신 웹 애플리케이션 개발에서 빌드 도구의 속도와 성능을 대폭 향상시키기 위해 설계된 초고속 번들러입니다. ESBuild는 **Go 언어**로 작성되었으며, 현대적인 웹 애플리케이션 개발을 지원하는 여러 기능을 제공합니다.

---

## 주요 기능

- **초고속 빌드 속도** (캐시 없이도 빠름)
- **JavaScript, CSS, TypeScript, JSX** 지원
- 간단한 CLI, JavaScript, Go API
- **ESM** 및 **CommonJS 모듈** 번들링
- **CSS 번들링** 및 **CSS 모듈** 지원
- **트리 쉐이킹(Tree Shaking)**, **코드 축소(Minification)**, **소스맵** 생성
- **로컬 서버**, **파일 변경 감지(Watch Mode)**, **플러그인** 시스템 제공

---

## ESBuild가 빠른 이유

1. **Go 언어로 개발**  
   Go는 병렬 처리가 강력하며, JavaScript보다 성능 최적화가 잘 이루어져 있습니다. JavaScript 기반 번들러와 달리 ESBuild는 네이티브 코드로 컴파일되어 실행 속도가 매우 빠릅니다.

   **병렬 처리**: Go는 여러 CPU 코어를 효율적으로 활용하여 처리 속도를 극대화합니다.  
   **메모리 공유**: Go의 스레드는 메모리를 공유하므로 작업 간 데이터 직렬화(serialization)가 필요 없습니다.

   > **병렬 처리**: 여러 작업을 동시에 수행하여 속도를 향상시키는 기법.  
   > **직렬화**: 데이터를 저장하거나 전송하기 위해 형식에 맞춰 변환하는 과정.

2. **전체 로직 자체 개발**  
   ESBuild는 외부 라이브러리에 의존하지 않고 모든 로직을 직접 구현했습니다.

   - 일관된 데이터 구조 사용
   - 필요할 때 아키텍처 전체를 최적화 가능

   예를 들어, 대부분의 번들러는 TypeScript 컴파일러를 사용하지만, ESBuild는 자체 TypeScript 파서를 사용하여 성능 병목을 최소화합니다.

3. **최소한의 메모리 사용**  
   ESBuild는 작업 데이터를 최소한의 메모리로 처리하여 CPU 캐시에 효율적으로 접근합니다.
   - 데이터 변환 과정을 줄이고, 데이터 구조를 재사용하도록 설계
   - 불필요한 메모리 할당을 방지

---

## 벤치마크 결과

### JavaScript 번들링

| 번들러          | 시간    | 상대 속도 | 처리 속도     | 번들 크기 |
| --------------- | ------- | --------- | ------------- | --------- |
| **ESBuild**     | 0.39초  | **1x**    | 1403.7 KLOC/s | 5.80 MB   |
| Parcel 2        | 14.91초 | 38x       | 36.7 KLOC/s   | 5.78 MB   |
| Rollup + Terser | 34.10초 | 87x       | 16.1 KLOC/s   | 5.82 MB   |
| Webpack 5       | 41.21초 | 106x      | 13.3 KLOC/s   | 5.84 MB   |

- ESBuild는 경쟁 도구보다 **10~100배** 빠릅니다.

---

## 주요 사용 사례

1. **Vite와의 통합**: ESBuild는 Vite에서 TypeScript를 JavaScript로 변환하는 데 사용됩니다.
2. **Snowpack**: 빠른 개발 환경 구축.
3. **Amazon CDK** 및 **Phoenix**: 코드를 번들링하기 위해 활용.

---

## ESBuild의 한계

- **타입 검사 미지원**: TypeScript의 타입 검사는 `tsc`를 별도로 실행해야 합니다.
- **모든 언어 지원 X**: 예를 들어, Svelte, Vue, Elm은 지원하지 않습니다.
- **핫 모듈 교체(HMR)**: 제공되지 않음.

> ESBuild는 단순함과 성능을 위해 "모든 기능을 갖춘 올인원 도구"가 아니라, 번들링에 초점을 맞춘 도구입니다.

---

ESBuild는 고성능 번들링 도구가 필요한 프로젝트에 적합하며, 최신 웹 개발에서 효율성과 생산성을 크게 향상시킬 수 있습니다.

---

### 참고

- https://esbuild.github.io/
- https://babeljs.io/docs/
