// 파일 경로: src/app/api/esp32/motor-command/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs'; // Import fs
import path from 'path'; // Import path

// Data file paths
const schedulesFilePath = path.join(process.cwd(), 'src/data', 'schedules.json');
const mappingFilePath = path.join(process.cwd(), 'src/data', 'mapping.json');

// 데이터 파일의 타입 정의
interface Schedule {
  id: string;
  supplement: string; // This is supplement name
  day: string;
  time: string;
  quantity?: number; // 알약 개수
  timestamp: number;
}

// Type for the simplified mapping.json (supplementName: motorId)
type SimpleMapping = {
  [supplementName: string]: number;
};

// API 응답을 위한 명령 타입
interface MotorCommand {
  motorId: number;
  rotations: number;
  supplement: string;
  scheduleId: string;
  quantity: number;
  rotationsPerPill: number;
}

function getDayStringForSchedule(dayNumber: number): string {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayNumber];
}

export async function GET(request: NextRequest) {
  console.log('[API /api/esp32/motor-command GET] Request received at', new Date().toISOString());
  try {
    let schedules: Schedule[];
    try {
      const schedulesFileContent = await fs.readFile(schedulesFilePath, 'utf8');
      schedules = schedulesFileContent.trim() ? JSON.parse(schedulesFileContent) as Schedule[] : [];
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('[API GET] schedules.json not found. Defaulting to empty array.');
        schedules = [];
      } else {
        console.error('[API GET] Error reading or parsing schedules.json:', error);
        schedules = []; // Default to empty array on other errors
      }
    }

    let mappings: SimpleMapping;
    try {
      const mappingFileContent = await fs.readFile(mappingFilePath, 'utf8');
      mappings = mappingFileContent.trim() ? JSON.parse(mappingFileContent) as SimpleMapping : {};
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('[API GET] mapping.json not found. Defaulting to empty object.');
        mappings = {};
      } else {
        console.error('[API GET] Error reading or parsing mapping.json:', error);
        mappings = {}; // Default to empty object on other errors
      }
    }

    if (schedules.length === 0) {
      console.log('[API GET] No schedules found or error reading schedules.json.');
      return NextResponse.json({ status: "no_schedules_configured" }, { status: 200 });
    }

    if (Object.keys(mappings).length === 0) {
      console.log('[API GET] No mappings found or error reading mapping.json.');
      return NextResponse.json({ status: "no_mappings_configured" }, { status: 200 });
    }

    const now = new Date();
    const currentDayString = getDayStringForSchedule(now.getDay());
    const currentTimeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    console.log(`[API GET] Current time: ${currentDayString} ${currentTimeString}`);

    const commandsToSend: MotorCommand[] = [];
    const DEFAULT_ROTATIONS_PER_PILL = 1; // rotationsPerPill is no longer in mapping.json, using a default.

    for (const schedule of schedules) {
      // 스케줄의 요일과 시간 일치 확인 (대소문자 구분 없이 요일 비교)
      if (schedule.day.toLowerCase() === currentDayString.toLowerCase() && schedule.time === currentTimeString) {
        console.log(`[API GET] Matched schedule:`, schedule);
        
        const motorId = mappings[schedule.supplement]; // schedule.supplement is the supplement name (e.g., "비타민 C")

        if (motorId !== undefined) { // Check if motorId is found (could be 0)
          const quantity = schedule.quantity || 1;
          const rotationsPerPill = DEFAULT_ROTATIONS_PER_PILL; // Using default
          const totalRotations = quantity * rotationsPerPill;

          commandsToSend.push({
            motorId: motorId,
            rotations: totalRotations,
            supplement: schedule.supplement,
            scheduleId: schedule.id,
            quantity: quantity,
            rotationsPerPill: rotationsPerPill
          });
          console.log(`[API GET] Found mapping and prepared command:`, commandsToSend[commandsToSend.length-1]);
        } else {
          console.warn(`[API GET] Schedule found for ${schedule.supplement}, but no mapping configured for it in mapping.json (using supplement name as key).`);
        }
      }
    }

    if (commandsToSend.length > 0) {
      console.log('[API GET] Sending commands to ESP32:', commandsToSend);
      return NextResponse.json(commandsToSend, { status: 200 });
    } else {
      console.log('[API GET] No command due at this time.');
      return NextResponse.json({ status: "no_command_due", checkedTime: currentTimeString, checkedDay: currentDayString }, { status: 200 });
    }

  } catch (error)