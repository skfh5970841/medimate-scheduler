// 파일 경로: src/app/api/schedules/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// 데이터 파일 경로
const dataFilePath = path.join(process.cwd(), 'src/data', 'schedules.json');
const dataDir = path.dirname(dataFilePath);

// @/types에 정의된 Schedule 타입을 사용해야 하지만, 직접 수정 불가하므로 로컬에 정의
// 실제 프로젝트에서는 @/types/index.ts (또는 해당 파일)의 Schedule 인터페이스에 quantity를 추가해야 합니다.
interface Schedule {
  id: string;
  supplement: string;
  day: string;
  time: string;
  quantity: number; // 알약 개수 필드 추가
  timestamp: number; 
}

// Function to ensure the data directory exists
async function ensureDirectoryExists() {
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
}

async function readSchedules(): Promise<Schedule[]> {
  await ensureDirectoryExists();
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf8');
    if (!fileContent.trim()) {
        return [];
    }
    return JSON.parse(fileContent);
  } catch (error: any) {
     if (error.code === 'ENOENT') {
       return [];
     }
    console.error('Error reading schedules from file:', error);
    return [];
  }
}

async function writeSchedules(schedules: Schedule[]): Promise<void> {
  await ensureDirectoryExists();
  try {
    await fs.writeFile(dataFilePath, JSON.stringify(schedules, null, 2), 'utf8');
  } catch (error: any) {
    console.error('Error writing schedules to file:', error);
    throw error; 
  }
}

interface Params {
  id: string;
}

// PUT: 특정 스케줄 업데이트
export async function PUT(request: NextRequest, { params }: { params: Params }) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ message: 'Schedule ID is required' }, { status: 400 });
    }

    const updatedData = await request.json();

    // quantity 유효성 검사 (존재하는 경우에만, 다른 필드는 부분 업데이트 가능하도록)
    if (updatedData.quantity !== undefined && 
        (typeof updatedData.quantity !== 'number' || 
         !Number.isInteger(updatedData.quantity) || 
         updatedData.quantity <= 0)) {
      return NextResponse.json({ message: '알약 개수(quantity)는 0보다 큰 정수여야 합니다.' }, { status: 400 });
    }

    const schedules = await readSchedules();
    const scheduleIndex = schedules.findIndex(schedule => schedule.id === id);

    if (scheduleIndex === -1) {
      return NextResponse.json({ message: 'Schedule not found' }, { status: 404 });
    }

    // 기존 스케줄 데이터에 업데이트된 데이터 병합
    // supplement, day, time, quantity 필드만 업데이트 허용
    const originalSchedule = schedules[scheduleIndex];
    schedules[scheduleIndex] = {
      ...originalSchedule, // 기존 값 유지
      supplement: updatedData.supplement !== undefined ? updatedData.supplement : originalSchedule.supplement,
      day: updatedData.day !== undefined ? updatedData.day : originalSchedule.day,
      time: updatedData.time !== undefined ? updatedData.time : originalSchedule.time,
      quantity: updatedData.quantity !== undefined ? updatedData.quantity : originalSchedule.quantity,
      timestamp: Date.now(), // 업데이트 시 타임스탬프 갱신
    };

    // 필수 필드들이 여전히 유효한지 확인 (예: 업데이트 후 supplement가 없어지는 경우 방지)
    if (!schedules[scheduleIndex].supplement || !schedules[scheduleIndex].day || !schedules[scheduleIndex].time || schedules[scheduleIndex].quantity === undefined) {
        return NextResponse.json({ message: '영양제, 요일, 시간, 알약 개수는 필수 항목입니다.' }, { status: 400 });
    }

    await writeSchedules(schedules);
    console.log(`[API /api/schedules PUT] Updated schedule: ${id}`);
    return NextResponse.json(schedules[scheduleIndex], { status: 200 });

  } catch (error: any) {
    console.error('[API /api/schedules PUT] Error:', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: '잘못된 JSON 형식입니다.' }, { status: 400 });
    }
    return NextResponse.json({ message: '스케줄 업데이트 중 서버 오류가 발생했습니다.' }, { status: 500 });
  }
}


export async function DELETE(request: Request, {params}: {params: Params}) {
  try {
    const id = params.id;
    if (!id) {
        return NextResponse.json({ message: 'Schedule ID is required' }, { status: 400 });
    }
    const schedules = await readSchedules();
    const initialLength = schedules.length;
    const updatedSchedules = schedules.filter(schedule => schedule.id !== id);

    if (updatedSchedules.length === initialLength) {
        return NextResponse.json({ message: 'Schedule not found' }, { status: 404 });
    }

    await writeSchedules(updatedSchedules);
    console.log(`[API /api/schedules DELETE] Deleted schedule: ${id}`);
    return NextResponse.json({message: '스케줄이 성공적으로 삭제되었습니다.'}, {status: 200});
  } catch (error: any) {
    console.error('DELETE Error:', error);
    return NextResponse.json({ message: '스케줄 삭제 중 서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
