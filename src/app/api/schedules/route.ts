import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// 데이터 파일 경로
const dataFilePath = path.join(process.cwd(), 'src/data', 'schedules.json');

interface Schedule {
  id: string;
  supplement: string;
  day: string;
  time: string;
  timestamp: number; // Date.now() 값을 저장하여 생성/수정 시간을 기록
}

// 스케줄 파일 읽기
async function readSchedules(): Promise<Schedule[]> {
  try {
    const jsonData = await fs.readFile(dataFilePath, 'utf8');
    if (!jsonData.trim()) {
      return []; // 파일이 비어있으면 빈 배열 반환
    }
    return JSON.parse(jsonData) as Schedule[];
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return []; // 파일이 없으면 빈 배열 반환
    }
    console.error('Error reading schedules.json:', error);
    throw new Error('스케줄 데이터를 읽는데 실패했습니다.');
  }
}

// 스케줄 파일 쓰기
async function writeSchedules(schedules: Schedule[]): Promise<void> {
  try {
    const jsonData = JSON.stringify(schedules, null, 2);
    await fs.writeFile(dataFilePath, jsonData, 'utf8');
  } catch (error) {
    console.error('Error writing schedules.json:', error);
    throw new Error('스케줄 데이터를 저장하는데 실패했습니다.');
  }
}

// GET: 모든 스케줄 조회 또는 lastUpdated 이후의 스케줄 조회 (ESP32용)
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

// POST: 새 스케줄 추가
export async function POST(request: NextRequest) {
  try {
    const newScheduleData = await request.json();

    if (!newScheduleData.supplement || !newScheduleData.day || !newScheduleData.time) {
      return NextResponse.json({ message: '영양제, 요일, 시간은 필수 항목입니다.' }, { status: 400 });
    }

    const schedules = await readSchedules();
    
    const newSchedule: Schedule = {
      id: uuidv4(), // 고유 ID 생성
      supplement: newScheduleData.supplement,
      day: newScheduleData.day,
      time: newScheduleData.time,
      timestamp: Date.now(), // 현재 타임스탬프 추가
    };

    schedules.push(newSchedule);
    await writeSchedules(schedules);
    
    console.log(`[API /api/schedules POST] Added new schedule: ${newSchedule.id}`); // 수정된 부분
    return NextResponse.json(newSchedule, { status: 201 });

  } catch (error: any) {
    console.error('[API /api/schedules POST] Error:', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: '잘못된 JSON 형식입니다.' }, { status: 400 });
    }
    return NextResponse.json({ message: error.message || '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
