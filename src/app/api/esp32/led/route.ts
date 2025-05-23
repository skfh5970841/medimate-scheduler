// 파일 경로: src/app/api/esp32/led/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLedState, setLedState } from '@/lib/ledState'; // 상태 관리 유틸리티 import

// GET: ESP32가 이 경로로 폴링하여 최신 LED 상태 명령을 가져갑니다.
export async function GET(request: NextRequest) {
  try {
    // (선택 사항) ESP32가 자신의 상태를 쿼리 파라미터로 보냈는지 확인
    const espReportedState = request.nextUrl.searchParams.get('currentState');
    if (espReportedState) {
      console.log(`[API /api/esp32/led GET] ESP32 reported state: ${espReportedState}`);
      // 이 정보를 로깅하거나 다른 용도로 활용 가능
    }

    // 저장된 최신 LED 상태 명령 가져오기
    const commandToSend = await getLedState(); // 저장된 상태 읽기

    console.log(`[API /api/esp32/led GET] Sending command to ESP32: ${commandToSend}`);

    // ESP32가 파싱할 JSON 형식으로 응답 ('state' 키 사용)
    return NextResponse.json({ state: commandToSend }, { status: 200 });

  } catch (error) {
    console.error('[API /api/esp32/led GET] Error getting command for ESP32:', error);
    // ESP32는 복잡한 에러 메시지를 처리하기 어려울 수 있으므로 간단한 응답 고려
    return NextResponse.json({ error: 'Error getting command' }, { status: 500 });
  }
}

// POST: 웹 UI가 이 경로로 요청하여 LED 상태 변경을 명령합니다.
export async function POST(request: NextRequest) {
  try {
    // 요청 본문에서 'state' 값 ( 'on' 또는 'off' ) 추출
    const body = await request.json();
    const newState = body.state;

    // 유효한 상태 값인지 확인
    if (newState !== 'on' && newState !== 'off') {
      console.log(`[API /api/esp32/led POST] Invalid state received: ${newState}`);
      return NextResponse.json({ message: 'Invalid state. Must be "on" or "off".' }, { status: 400 });
    }

    // 새로운 LED 상태 저장
    await setLedState(newState);
    console.log(`[API /api/esp32/led POST] Set LED state command to: ${newState}`);

    // 성공 응답 반환
    return NextResponse.json({ message: `LED state command set to ${newState}` }, { status: 200 });

  } catch (error) {
    console.error('[API /api/esp32/led POST] Error setting LED state command:', error);
    return NextResponse.json({ message: 'Error setting LED state command' }, { status: 500 });
  }
}
