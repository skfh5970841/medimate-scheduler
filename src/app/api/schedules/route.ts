// 파일 경로: src/app/api/schedules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs'; // Node.js 14+ 
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// 데이터 파일 경로
const dataFilePath = path.join(process.cwd(), 'src/data', 'schedules.json');

interface Schedule {
  id: string;
  supplement: string;
  day: string;
  time: string;
  quantity: number; // 알약 개수 필드 추가
  timestamp: number; 
}

// 스케줄 파일 읽기 (기존과 동일, 반환 타입만 Schedule[]로 유지)
async function readSchedules(): Promise<Schedule[]> {
  try {
    const jsonData = await fs.readFile(dataFilePath, 'utf8');
    if (!jsonData.trim()) {
      return [];
    }
    return JSON.parse(jsonData) as Schedule[];
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    console.error('Error reading schedules.json:', error);
    throw new Error('스케줄 데이터를 읽는데 실패했습니다.');
  }
}

// 스케줄 파일 쓰기 (기존과 동일)
async function writeSchedules(schedules: Schedule[]): Promise<void> {
  try {
    const jsonData = JSON.stringify(schedules, null, 2);
    await fs.writeFile(dataFilePath, jsonData, 'utf8');
  } catch (error) {
    console.error('Error writing schedules.json:', error);
    throw new Error('스케줄 데이터를 저장하는데 실패했습니다.');
  }
}

// GET: 모든 스케줄 조회 (기존 로직과 거의 동일, Schedule 타입 사용)
export async function GET(request: NextRequest) {
  try {
    const schedules = await readSchedules();
    const { searchParams } = new URL(request.url);
    const lastUpdatedParam = searchParams.get('lastUpdated');

    if (lastUpdatedParam) {
      const lastUpdatedTimestamp = parseInt(lastUpdatedParam, 10);
      if (isNaN(lastUpdatedTimestamp)) {
        return NextResponse.json({ message: '잘못된 lastUpdated 파라미터입니다.' }, { status: 400 });
      }
      
      const updatedSchedules = schedules.filter(schedule => schedule.timestamp > lastUpdatedTimestamp);
      console.log(`[API /api/schedules GET] ESP32 requested schedules since ${lastUpdatedTimestamp}. Found ${updatedSchedules.length} items.`);
      return NextResponse.json(updatedSchedules);
    } else {
      console.log(`[API /api/schedules GET] Sending all ${schedules.length} schedules.`);
      return NextResponse.json(schedules);
    }
  } catch (error: any) {
    console.error('[API /api/schedules GET] Error:', error);
    return NextResponse.json({ message: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// POST: 새 스케줄 추가 (quantity 처리 추가)
export async function POST(request: NextRequest) {
  try {
    const newScheduleData = await request.json();

    // quantity 유효성 검사 추가 (양의 정수여야 함)
    if (!newScheduleData.supplement || 
        !newScheduleData.day || 
        !newScheduleData.time || 
        newScheduleData.quantity === undefined || // quantity가 있는지 확인
        typeof newScheduleData.quantity !== 'number' || // 숫자인지 확인
        !Number.isInteger(newScheduleData.quantity) || // 정수인지 확인
        newScheduleData.quantity <= 0) { // 양수인지 확인
      return NextResponse.json({ message: '영양제, 요일, 시간, 그리고 0보다 큰 정수 형태의 알약 개수는 필수 항목입니다.' }, { status: 400 });
    }

    const schedules = await readSchedules();
    
    const newSchedule: Schedule = {
      id: uuidv4(),
      supplement: newScheduleData.supplement,
      day: newScheduleData.day,
      time: newScheduleData.time,
      quantity: newScheduleData.quantity, // 요청에서 quantity 값 사용
      timestamp: Date.now(),
    };

    schedules.push(newSchedule);
    await writeSchedules(schedules);
    
    console.log(`[API /api/schedules POST] Added new schedule: ${newSchedule.id} with quantity ${newSchedule.quantity}`);
    return NextResponse.json(newSchedule, { status: 201 });

  } catch (error: any) {
    console.error('[API /api/schedules POST] Error:', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: '잘못된 JSON 형식입니다.' }, { status: 400 });
    }
    return NextResponse.json({ message: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
