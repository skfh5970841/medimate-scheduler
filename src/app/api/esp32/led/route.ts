// 파일 경로: src/app/api/esp32/led/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLedState, setLedState } from '@/lib/ledState'; // 상태 관리 유틸리티 import

export async function GET(request: NextRequest) {
  try {
    const espReportedState = request.nextUrl.searchParams.get('currentState');
    if (espReportedState) {
      console.log(`[API /api/esp32/led GET] ESP32 reported state: ${espReportedState}`);
    }

    const commandToSend = await getLedState(); 

    console.log(`[API /api/esp32/led GET] Sending command to ESP32: ${commandToSend}`);

    return NextResponse.json({ state: commandToSend }, { status: 200 });

  } catch (error) {
    console.error('[API /api/esp32/led GET] Error getting command for ESP32:', error);
    return NextResponse.json({ error: 'Error getting command' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newState = body.state;

    if (newState !== 'on' && newState !== 'off') {
      console.log(`[API /api/esp32/led POST] Invalid state received: ${newState}`);
      return NextResponse.json({ message: 'Invalid state. Must be "on" or "off".' }, { status: 400 });
    }

    await setLedState(newState);
    console.log(`[API /api/esp32/led POST] Set LED state command to: ${newState}`);

    return NextResponse.json({ message: `LED state command set to ${newState}` }, { status: 200 });

  } catch (error) {
    console.error('[API /api/esp32/led POST] Error setting LED state command:', error);
    return NextResponse.json({ message: 'Error setting LED state command' }, { status: 500 });
  }
}
