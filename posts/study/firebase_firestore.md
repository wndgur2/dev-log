---
category: Study
title: firebase_firestore
date_started: 2024.12.26
date_updated: 2024.12.26
tags: firebase, cloud-service, database
isDraft: true
---

<img src='https://github.com/user-attachments/assets/618cf69a-3ddf-48bb-a2b5-286b847d2ac3' alt='firestore'/>



> Spring 서버의 Mysql 데이터베이스를 Firebase Firestore로 마이그레이션하는 과정을 정리합니다.

# Firestore란?

**Firestore**는 Google Cloud Platform의 NoSQL 데이터베이스 서비스로, 실시간 데이터베이스와 클라우드 데이터베이스의 장점을 결합한 서비스입니다. Firestore는 데이터를 JSON 형식으로 저장하며, 실시간 업데이트와 오프라인 지원을 제공합니다.

# Firestore vs MongoDB Atlas

**Firestore**와 **MongoDB Atlas**는 모두 클라우드 기반의 NoSQL 데이터베이스 서비스입니다. 하지만 두 서비스는 설계 목표와 기능 면에서 차이가 있습니다. 이 문서에서는 주요 차이점과 장단점을 비교합니다.

---

## **Firestore 개요**
- Google Firebase의 일부로, 모바일 및 웹 애플리케이션 개발에 최적화된 NoSQL 데이터베이스.
- **문서(Document)** 및 **컬렉션(Collection)** 기반 계층적 데이터 구조 제공.
- 실시간 동기화와 Firebase 인증, 호스팅 등의 서비스와 깊게 통합.

---

## **MongoDB Atlas 개요**
- MongoDB의 클라우드 서비스로, 완전 관리형 NoSQL 데이터베이스.
- JSON과 유사한 **BSON 형식**으로 데이터를 저장하며, 유연한 스키마 지원.
- 대규모 트래픽 처리 및 복잡한 쿼리에 강점.

---

## **주요 비교**

| **특징**                | **Firestore**                              | **MongoDB Atlas**                      |
|-------------------------|--------------------------------------------|----------------------------------------|
| **데이터 구조**          | 문서(Document)-컬렉션(Collection) 기반      | 문서(Document)-컬렉션(Collection) 기반  |
| **스키마(Schema)**       | 스키마리스(Schema-less)                    | 스키마리스(Schema-less)                |
| **실시간 동기화**        | 기본 제공                                 | 별도 설정 필요                        |
| **쿼리(Query)**          | 제한된 복잡성(기본 제공 조건 쿼리 가능)      | 매우 유연하고 복잡한 쿼리 지원         |
| **확장성(Scalability)**  | 자동 확장(수직 및 수평 확장 지원)           | 자동 확장(샤딩, 복제 지원)             |
| **오프라인 지원**        | 기본 제공                                 | MongoDB Realm을 통해 일부 지원         |
| **통합 서비스**          | Firebase 환경에 최적화된 서비스 제공         | 독립적 데이터베이스로 사용             |
| **사용 사례**            | 실시간 애플리케이션(채팅, 협업 등)          | 대규모 데이터 저장 및 분석             |
| **가격**                 | 단순한 종량제(Pay-as-you-go)               | 복잡한 종량제(Pay-as-you-go)           |

---

## **Firestore의 장단점**
### 장점:
1. **Firebase 통합**: 인증, 호스팅, 클라우드 함수 등과의 긴밀한 통합.
2. **실시간 동기화**: 모바일 앱에 적합.
3. **초보자 친화적**: 간단한 설정과 사용법.

### 단점:
1. **제한된 쿼리 기능**: 복잡한 데이터 처리에는 비효율적.
2. **플랫폼 종속**: Firebase 환경에 종속적.

---

## **MongoDB Atlas의 장단점**
### 장점:
1. **유연성**: 복잡한 데이터 구조 및 쿼리에 강함.
2. **대규모 확장성**: 샤딩(Sharding) 및 복제(Replication) 지원.
3. **다양한 언어 지원**: 광범위한 프로그래밍 언어 및 플랫폼과 호환.

### 단점:
1. **실시간 동기화 부족**: 기본적으로 제공하지 않음.
2. **복잡한 설정**: 초기 설정 및 관리가 Firestore에 비해 어렵다.

---

## **Firestore와 MongoDB Atlas는 언제 사용해야 할까?**
- **Firestore가 적합한 경우**:
  - 모바일/웹 앱 개발에서 실시간 데이터 동기화가 필요한 경우.
  - Firebase 생태계에 의존하며 빠른 개발과 배포가 목표인 프로젝트.
  
- **MongoDB Atlas가 적합한 경우**:
  - 대규모 데이터 처리 및 분석.
  - 복잡한 쿼리와 유연한 데이터 모델이 필요한 경우.
  - Firebase에 종속되지 않고 독립적으로 데이터베이스를 운영하려는 경우.

---

## **한국어 용어 설명**
- **스키마리스(Schema-less)**: 데이터베이스에 미리 정의된 데이터 구조가 없어 유연하게 데이터 추가/변경 가능.
- **샤딩(Sharding)**: 대규모 데이터를 여러 서버에 분산하여 저장하는 기술.
- **복제(Replication)**: 데이터를 여러 복사본으로 저장해 고가용성을 보장하는 기술.
- **실시간 동기화(Realtime Sync)**: 서버와 클라이언트 간 데이터를 즉시 일치시키는 기능.
