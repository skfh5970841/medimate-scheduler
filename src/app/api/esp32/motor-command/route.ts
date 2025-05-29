// 파일 경로: src/app/api/esp32/motor-command/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz'; // Import for timezone

// Data file paths
const schedulesFilePath = path.join(process.cwd(), 'src/data', 'schedules.json');
const mappingFilePath = path.join(process.cwd(), 'src/data', 'mapping.json');
const dataDir = path.dirname(schedulesFilePath); // Base data directory

// Function to ensure the data directory and a specific file (if it doesn't exist) are handled
async function ensureFileExists(filePath: string, defaultContent: string = '[]') {
    const dir = path.dirname(filePath);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
    try {
        await fs.access(filePath);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            try {
                await fs.writeFile(filePath, defaultContent, 'utf8');
                console.log(`[API GET] Created empty ${path.basename(filePath)}`);
            } catch (createError) {
                console.error(`[API GET] Failed to create empty ${path.basename(filePath)}:`, createError);
            }
        } else {
            throw error; // Re-throw other errors
        }
    }
}


// 데이터 파일의 타입 정의 - src/types.ts와 동기화
interface Schedule {
  id: string;
  supplement: string; // This is supplement name
  day: string; // e.g., "Monday", "Tuesday"
  time: string; // HH:MM format, e.g., "09:00"
  quantity?: number; // 알약 개수
  timestamp: number;
  lastExecutedAt?: number; // Timestamp of the last execution
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

// 스케줄이 저장된 기준 시간대
const TARGET_TIMEZONE = 'Asia/Seoul';

export async function GET(request: NextRequest) {
  console.log('[API /api/esp32/motor-command GET] Request received at', new Date().toISOString(), `(Server/UTC time)`);
  try {
    // Ensure data files exist or are created empty
    await ensureFileExists(schedulesFilePath, '[]'); // Default to empty array for schedules
    await ensureFileExists(mappingFilePath, '{}');   // Default to empty object for mappings


    let schedules: Schedule[];
    try {
      const originalSchedulesContent = await fs.readFile(schedulesFilePath, 'utf8');
      schedules = originalSchedulesContent.trim() ? JSON.parse(originalSchedulesContent) as Schedule[] : [];
    } catch (error: any) {
      // This catch might be redundant if ensureFileExists handles ENOENT, but kept for other read errors
      console.error('[API GET] Error reading or parsing schedules.json:', error);
      schedules = []; // 오류 발생 시 빈 배열로 처리하여 시스템 중단 방지
    }

    let mappings: SimpleMapping;
    try {
      const mappingFileContent = await fs.readFile(mappingFilePath, 'utf8');
      mappings = mappingFileContent.trim() ? JSON.parse(mappingFileContent) as SimpleMapping : {};
    } catch (error: any) {
      // Similar to schedules, this catch might be for errors other than ENOENT
      console.error('[API GET] Error reading or parsing mapping.json:', error);
      mappings = {}; // 오류 발생 시 빈 객체로 처리
    }

    if (schedules.length === 0) {
      console.log('[API GET] No schedules found or schedules.json is empty.');
      return NextResponse.json({ status: "no_schedules_configured" }, { status: 200 });
    }

    if (Object.keys(mappings).length === 0) {
      console.log('[API GET] No mappings found or mapping.json is empty.');
      return NextResponse.json({ status: "no_mappings_configured" }, { status: 200 });
    }

    const nowUtc = new Date();
    const nowInTargetTimezone = utcToZonedTime(nowUtc, TARGET_TIMEZONE);

    const currentDayString = formatInTimeZone(nowUtc, TARGET_TIMEZONE, 'EEEE'); // e.g., "Thursday"
    const currentTimeString = formatInTimeZone(nowUtc, TARGET_TIMEZONE, 'HH:mm'); // e.g., "14:34"
    const todayDateInTargetTimezone = formatInTimeZone(nowUtc, TARGET_TIMEZONE, 'yyyy-MM-dd'); // e.g., "2025-05-23"

    console.log(`[API GET] Current time in ${TARGET_TIMEZONE}: ${currentDayString} ${currentTimeString} (${todayDateInTargetTimezone})`);

    const commandsToSend: MotorCommand[] = [];
    const DEFAULT_ROTATIONS_PER_PILL = 1; 
    let schedulesWereUpdated = false;

    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i];
      // Ensure case-insensitive comparison for day and direct comparison for time
      if (schedule.day.toLowerCase() === currentDayString.toLowerCase() && schedule.time === currentTimeString) {
        
        // Check if lastExecutedAt is for today in the target timezone
        const lastExecutedDateStr = schedule.lastExecutedAt
          ? formatInTimeZone(new Date(schedule.lastExecutedAt), TARGET_TIMEZONE, 'yyyy-MM-dd')
          : null;

        if (lastExecutedDateStr === todayDateInTargetTimezone) {
          console.info(`[API GET] Schedule ${schedule.id} for '${schedule.supplement}' at ${schedule.time} already executed today (${lastExecutedDateStr}) in ${TARGET_TIMEZONE}. Skipping.`);
          continue; 
        }
        
        console.log(`[SERVER ALARM] Medication schedule due for '${schedule.supplement}' (Quantity: ${schedule.quantity || 1}) at ${schedule.time} on ${schedule.day} (in ${TARGET_TIMEZONE}).`);
        
        const motorId = mappings[schedule.supplement];
        if (motorId !== undefined) {
          const quantity = schedule.quantity || 1; // Default to 1 if quantity is not set
          const rotationsPerPill = DEFAULT_ROTATIONS_PER_PILL; 
          const totalRotations = quantity * rotationsPerPill;

          commandsToSend.push({
            motorId: motorId,
            rotations: totalRotations,
            supplement: schedule.supplement,
            scheduleId: schedule.id,
            quantity: quantity,
            rotationsPerPill: rotationsPerPill
          });
          
          schedules[i] = { ...schedule, lastExecutedAt: nowUtc.getTime() }; // Store as UTC milliseconds
          schedulesWereUpdated = true;
          console.log(`[API GET] Prepared command for ESP32: Motor ${motorId}, Rotations ${totalRotations} for ${schedule.supplement}. Marked as executed for today.`);
        } else {
          console.warn(`[API GET] Schedule found for ${schedule.supplement}, but no mapping configured.`);
        }
      }
    }

    if (schedulesWereUpdated) {
      try {
        await fs.writeFile(schedulesFilePath, JSON.stringify(schedules, null, 2));
        console.log('[API GET] Successfully updated schedules.json with lastExecutedAt timestamps.');
      } catch (writeError) {
        console.error('[API GET] CRITICAL: Failed to write updated schedules.json:', writeError);
      }
    }

    if (commandsToSend.length > 0) {
      console.log('[API GET] Sending commands to ESP32:', commandsToSend);
      return NextResponse.json(commandsToSend, { status: 200 });
    } else {
      console.log('[API GET] No command due at this time or already executed.');
      return NextResponse.json({ status: "no_command_due_or_already_executed", checkedTime: currentTimeString, checkedDay: currentDayString, timezone: TARGET_TIMEZONE }, { status: 200 });
    }

  } catch (error: any) {
    console.error('[API /api/esp32/motor-command GET] Error processing request:', error);
    // Ensure a JSON response for errors
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: "Internal server error", details: errorMessage }, { status: 500 });
  }
}

    