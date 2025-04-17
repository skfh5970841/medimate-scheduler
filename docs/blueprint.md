# **App Name**: MediMate Scheduler

## Core Features:

- User Authentication: Login authentication using a simple form and fixed credentials.
- Schedule Display: Display the schedule in a clear, weekly format.
- Schedule Creation: Add new schedules via a modal form.
- Supplement Selection: Populate the supplement dropdown using API (GET /api/supplements).
- Schedule Persistence: Save new schedules to JSON files.

## Style Guidelines:

- Primary color: Calming blue (#B0E2FF) for a sense of reliability.
- Secondary color: Light gray (#F5F5F5) for backgrounds and subtle contrast.
- Accent: Teal (#008080) for interactive elements and highlights.
- Clean and readable sans-serif fonts for clear schedule presentation.
- Simple, outline-style icons for supplements and actions.
- A clean, card-based layout for displaying schedules.
- Smooth transitions for modal appearance and schedule updates.

## Original User Request:
아두이노를 활용하여 웹 인터페이스로 제어 가능한 맞춤형 영양제 디스펜서. 사용자가 웹을 통해 편리하게 영양제 섭취 일정을 관리할 수 있다 이 중에서 웹과 관련한 것을 너에게 시키는 것
핵심 기능 구현 흐름 요약
로그인: login.html -> JS -> POST /api/login (Node.js: 고정값 비교) -> 성공 시 main.html 이동.
메인 스케줄 표시: main.html 로드 -> JS -> GET /api/schedules (Node.js: DB 조회) -> JS (데이터 가공 및 요일별 HTML 렌더링).
스케줄 추가: main.html '추가' 버튼 클릭 -> JS (모달/폼 표시) -> JS (GET /api/supplements로 드롭다운 채우기) -> 사용자 입력 -> '저장' 버튼 클릭 -> JS -> POST /api/schedules (Node.js: DB 저장) -> JS (성공 시 모달 닫고 메인 스케줄 새로고침).
  