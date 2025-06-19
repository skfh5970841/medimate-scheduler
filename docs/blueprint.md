# **앱 이름**: ESP32 연동 영양제 스케줄러 

## 핵심 기능:
- **사용자 인증**: 간단한 폼을 이용한 로그인 인증
- **스케줄 관리 (CRUD)**:
    - 스케줄을 명확하고 사용자 친화적인 형식(캘린더 형식)으로 표시
    - 스케줄 생성
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
    - TypeScript (새로운 static 타입을 정의하여 효과적으로 자원 관리 가능)
    - Tailwind CSS (제작된 디자인 모듈을 가져와 디자인에 걸리는 시간을 줄이고, 핵심 기능 구현에 집중)
- **백엔드**:
    - Next.js API Routes (Node.js)
    - 데이터 저장을 위한 JSON 파일 (`src/data/`)
- **하드웨어**:
    - ESP32 
    - 아두이노 

## 주요 API 엔드포인트 (`src/app/api/`): 프론트와 백엔드의 통신 api, 백엔드와 esp32의 통신 api 모두 있습니다
- **스케줄 관련**:
    - `GET /api/schedules`: 모든 스케줄 조회
    - `POST /api/schedules`: 새 스케줄 생성
    - `GET /api/schedules/[id]`: 특정 ID의 스케줄 조회
    - `PUT /api/schedules/[id]`: 특정 스케줄 업데이트
    - `DELETE /api/schedules/[id]`: 특정 스케줄 삭제
- **영양제 관련**:
    - `GET /api/supplements`: 모든 영양제 조회
    - `POST /api/supplements`: 새 영양제 추가 
- **디스펜서 매핑 관련**:
    - `GET /api/dispenser-mapping`: 현재 모터 매핑 정보 조회 ( 몇 번 모터에 어떤 영양제가 매핑되어있는가? )
    - `POST /api/dispenser-mapping`: 모터 매핑 생성 또는 업데이트 ( 확장성을 고려하기 위해서, 새로운 모터(영양제 통)을 추가/수정할 수 있도록 만들었습니다)
- **ESP32 제어 관련**:
    - `POST /api/esp32/motor-command`: 모터 제어 명령 전송 / 여러 개의 스케줄이 있을 경우 json에 배열을 담아 보내고, 그렇지 않을 경우 단일 객체로 전송합니다. esp32에서는 이를 받아 배열일 경우와 그렇지 않을 경우를 나누어 파싱합니다(ppt에 첨부한 코드 참고)
    - `GET /api/esp32/quantity` (또는 `POST`): 영양제 수량 관련 상호작용

## 데이터 저장소 (`src/data/*.json`):
- `users.json`: 사용자 인증 정보 저장
- `schedules.json`: 사용자가 정의한 영양제 스케줄 저장
- `supplements.json`: 사용 가능한 영양제 목록 저장
- `mapping.json`: 영양제와 디스펜서 모터 간의 매핑 정보 저장
- `ledState.json`: ESP32 LED의 현재 상태 저장 (단순 테스트용 api 코드 입니다)
### DB서버(mysql, sqllite 등) 사용을 하고자 하였으나, 무료로 호스팅 가능한 db서버가 한정적이고, 사용자가 많지않아 동시에 처리하는 프로세스(멀티 프로세스)가 거의 없을것이라 생각했습니다.
### 구현되지 않은 아이디어 : app연동과 알람 설정, 이것을 구현하기 위해서는 DB서버를 따로 사용하는 것이 효과적이긴 합니다