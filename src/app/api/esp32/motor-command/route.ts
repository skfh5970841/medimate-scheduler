// 파일 경로: src/app/api/esp32/motor-command/route.ts
import { NextRequest, NextResponse } from 'next/server';

// default_api.read_file을 사용하기 위한 타입 (응답 객체 구조에 맞춤)
interface ReadFileResponse {
  read_file_response: {
    result: string; // 파일 내용이 문자열로 반환됨
    status: string;
  };
}

// 데이터 파일의 타입 정의
interface Schedule {
  id: string;
  supplement: string; 
  day: string; 
  time: string; 
  quantity?: number; // 알약 개수 (이제부터 사용될 필드)
  timestamp: number;
}

interface Mapping {
  dispenserId: string;
  supplementId: string; 
  motorId: number;
  rotationsPerPill: number; // 알약 1개당 회전 수
}

function getDayStringForSchedule(dayNumber: number): string {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayNumber];
}

export async function GET(request: NextRequest) {
  console.log('[API /api/esp32/motor-command GET] Request received at', new Date().toISOString());
  try {
    const schedulesResponse = (await default_api.read_file(path: 'src/data/schedules.json')) as ReadFileResponse;
    const schedules: Schedule[] = JSON.parse(schedulesResponse.read_file_response.result);

    const mappingResponse = (await default_api.read_file(path: 'src/data/mapping.json')) as ReadFileResponse;
    const mappings: Mapping[] = JSON.parse(mappingResponse.read_file_response.result);

    if (!schedules || schedules.length === 0) {
      console.log('[API GET] No schedules found.');
      return NextResponse.json({ status: "no_schedules_configured" }, { status: 200 });
    }

    if (!mappings || mappings.length === 0) {
      console.log('[API GET] No mappings found.');
      return NextResponse.json({ status: "no_mappings_configured" }, { status: 200 });
    }

    const now = new Date();
    const currentDayString = getDayStringForSchedule(now.getDay());
    const currentTimeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    console.log(`[API GET] Current time: ${currentDayString} ${currentTimeString}`);

    let commandToSend = null;

    for (const schedule of schedules) {
      // 스케줄의 요일과 시간 일치 확인 (대소문자 구분 없이 요일 비교)
      if (schedule.day.toLowerCase() === currentDayString.toLowerCase() && schedule.time === currentTimeString) {
        console.log(`[API GET] Matched schedule:`, schedule);
        const mapping = mappings.find(m => m.supplementId === schedule.supplement);
        
        if (mapping) {
          // quantity 필드가 없다면 기본값 1로 간주 (schedules.json 업데이트 전까지의 호환성)
          const quantity = schedule.quantity || 1; 
          const totalRotations = quantity * mapping.rotationsPerPill;

          commandToSend = {
            motorId: mapping.motorId,
            rotations: totalRotations, // 계산된 총 회전 수
            supplement: schedule.supplement,
            scheduleId: schedule.id,
            quantity: quantity,
            rotationsPerPill: mapping.rotationsPerPill
          };
          console.log(`[API GET] Found mapping and prepared command:`, commandToSend);
          break; 
        } else {
          console.warn(`[API GET] Schedule found for ${schedule.supplement}, but no mapping configured for it.`);
        }
      }
    }

    if (commandToSend) {
      console.log('[API GET] Sending command to ESP32:', commandToSend);
      return NextResponse.json(commandToSend, { status: 200 });
    } else {
      console.log('[API GET] No command due at this time.');
      return NextResponse.json({ status: "no_command_due", checkedTime: currentTimeString, checkedDay: currentDayString }, { status: 200 });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /api/esp32/motor-command GET] Error processing request:', errorMessage, error);
    return NextResponse.json({ error: 'Failed to process motor command request', details: errorMessage }, { status: 500 });
  }
}
