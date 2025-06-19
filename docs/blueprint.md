# **앱 이름**: ESP32 연동 영양제 스케줄러

## 핵심 기능:

- **사용자 인증**: 간단한 폼을 이용한 로그인 인증
- **스케줄 관리 (CRUD)**:
    - 스케줄을 명확하고 사용자 친화적인 형식(예: 캘린더 또는 목록)으로 표시
    - 모달 폼을 통해 새 스케줄 생성
    - 스케줄 삭제
- **영양제 관리**:
    - API (`GET /api/supplements`)를 사용하여 영양제 선택 드롭다운 목록을 채움.
- **디스펜서 매핑**:
    - 영양제를 ESP32 디스펜서의 특정 모터에 매핑
    - 매핑 정보 관리 및 업데이트
- **데이터 지속성**: 스케줄, 영양제 목록, 매핑 정보를 JSON 파일 (`src/data/`)에 저장
- **ESP32 하드웨어 제어**:
    - 스케줄에 따라 영양제를 배출하도록 ESP32에 명령 전송 (`/api/esp32/motor-command`)
    - ESP32를 통해 영양제 수량 모니터링 가능성 (`/api/esp32/quantity`)

## 기술 스택:

- **프론트엔드**:
    - Next.js (리액트 프레임워크)
    - TypeScript
    - Tailwind CSS
- **백엔드**:
    - Next.js API Routes (Node.js)
    - 데이터 저장을 위한 JSON 파일 (`src/data/`)
- **하드웨어**:
    - ESP32 마이크로컨트롤러

## 주요 API 엔드포인트 (`src/app/api/`):

- **스케줄 관련**:
    - `GET /api/schedules`: 모든 스케줄 조회.
    - `POST /api/schedules`: 새 스케줄 생성.
    - `GET /api/schedules/[id]`: 특정 ID의 스케줄 조회.
    - `PUT /api/schedules/[id]`: 특정 스케줄 업데이트.
    - `DELETE /api/schedules/[id]`: 특정 스케줄 삭제.
- **영양제 관련**:
    - `GET /api/supplements`: 모든 영양제 조회
    - `POST /api/supplements`: 새 영양제 추가 
- **디스펜서 매핑 관련**:
    - `GET /api/dispenser-mapping`: 현재 모터 매핑 정보 조회
    - `POST /api/dispenser-mapping`: 모터 매핑 생성 또는 업데이트
- **ESP32 제어 관련**:
    - `POST /api/esp32/motor-command`: 모터 제어 명령 전송.
    - `GET /api/esp32/quantity` (또는 `POST`): 영양제 수량 관련 상호작용.

## 데이터 저장소 (`src/data/*.json`):
- `users.json`: 사용자 인증 정보 저장 (간단한 인증용).
- `schedules.json`: 사용자가 정의한 영양제 스케줄 저장.
- `supplements.json`: 사용 가능한 영양제 목록 저장.
- `mapping.json`: 영양제와 디스펜서 모터 간의 매핑 정보 저장.
- `ledState.json`: ESP32 LED의 현재 상태 저장.

## 기존 사용자 요청 (Next.js 컨텍스트에 맞게 재평가):

**기존 목표:** "웹 인터페이스를 통해 제어할 수 있는 맞춤형 영양제 디스펜서. 사용자는 웹을 통해 편리하게 영양제 섭취 스케줄을 관리할 수 있다."

**웹 컴포넌트 개발 흐름 (Next.js 적용):**

1.  **로그인**:
    - 사용자는 로그인 페이지(예: `/login` 또는 메인 페이지의 컴포넌트)로 이동.
    - 프론트엔드(리액트 컴포넌트)가 폼 입력을 처리.
    - 제출 시, `POST /api/auth/login`과 같은 API 라우트로 요청 전송 (구현 방식은 `users.json`을 확인하는 간단한 방식 또는 NextAuth.js 사용 등 다양할 수 있음).
    - 성공 시, 사용자는 메인 애플리케이션 기능에 접근 권한을 얻음 (예: `/` 또는 메인 스케줄 페이지로 리디렉션).
2.  **메인 스케줄 표시**:
    - 사용자는 메인 스케줄 페이지(예: `/`)로 이동.
    - 프론트엔드(예: `SchedulePage.tsx` 컴포넌트)가 로드/마운트될 때.
    - `/api/schedules`로 `GET` 요청을 보내 스케줄 데이터를 가져옴.
    - 백엔드(Next.js API 라우트)는 `schedules.json` 파일을 읽어 데이터를 반환.
    - 프론트엔드는 데이터를 처리하고 `src/components/ui/`의 컴포넌트들을 사용하여 스케줄을 렌더링.
3.  **스케줄 생성/수정**:
    - 사용자가 '스케줄 추가' 또는 '스케줄 수정' 버튼을 클릭.
    - 프론트엔드는 모달(예: `ScheduleModal.tsx`)을 표시.
    - 모달 폼은 `GET /api/supplements`를 통해 사용 가능한 영양제 목록을 가져와 드롭다운을 채울 수 있음.
    - 사용자는 스케줄 세부 정보(영양제, 시간, 수량 등)를 입력.
    - '저장' 시, 프론트엔드는 새 스케줄의 경우 `POST`, 기존 스케줄 수정의 경우 `PUT` (예: `/api/schedules/[id]`) 요청을 스케줄 데이터와 함께 전송.
    - 백엔드 API 라우트는 데이터를 `schedules.json`에 저장.
    - 성공 시, 프론트엔드는 메인 스케줄 표시를 업데이트.
4.  **디스펜서 매핑**:
    - 사용자는 매핑 페이지(예: `/mapping`)로 이동.
    - 프론트엔드(`MappingPage.tsx`)는 `GET /api/dispenser-mapping`으로 현재 매핑 정보를, `GET /api/supplements`로 사용 가능한 영양제 목록을 가져옴.
    - 사용자는 매핑을 생성하거나 수정.
    - '저장' 시, 프론트엔드는 `POST /api/dispenser-mapping` 요청을 전송.
    - 백엔드 API 라우트는 `mapping.json`에 저장.
