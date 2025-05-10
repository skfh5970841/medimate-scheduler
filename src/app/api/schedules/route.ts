
import {NextResponse} from 'next/server';
import {promises as fs} from 'fs';
import path from 'path';
import type {Schedule} from '@/types'; // Ensure Schedule type is imported

const dataFilePath = path.join(process.cwd(), 'src/data', 'schedules.json');
const dataDir = path.dirname(dataFilePath);

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
    // Handle empty file case
    if (!fileContent.trim()) {
        return [];
    }
    return JSON.parse(fileContent);
  } catch (error: any) {
     // If the file doesn't exist, return an empty array
     if (error.code === 'ENOENT') {
       return [];
     }
    console.error('Error reading schedules from file:', error);
    // For other errors, still return empty but log it
    return [];
  }
}

async function writeSchedules(schedules: Schedule[]): Promise<void> {
  await ensureDirectoryExists();
  try {
    await fs.writeFile(dataFilePath, JSON.stringify(schedules, null, 2), 'utf8');
  } catch (error: any) {
    console.error('Error writing schedules to file:', error);
    throw error; // Re-throw the error to be caught by the calling function
  }
}

export async function GET(request: Request) {
  try {
    const {searchParams} = new URL(request.url);
    const lastUpdated = searchParams.get('lastUpdated');

    if (lastUpdated && isNaN(Number(lastUpdated))) {
      return NextResponse.json({ message: 'Invalid lastUpdated parameter. It must be a number.' }, { status: 400 });
    }

    let schedules = await readSchedules();

    if (lastUpdated) {
        const lastUpdatedTime = parseInt(lastUpdated, 10);

        if (isNaN(lastUpdatedTime)) {
            return NextResponse.json({ message: 'Invalid lastUpdated parameter. It must be a valid timestamp.' }, { status: 400 });
        }

        schedules = schedules.filter(schedule => {
            // Ensure schedule.timestamp is treated as a number if it exists
            const scheduleTimestamp = Number(schedule.timestamp);
            return !isNaN(scheduleTimestamp) && scheduleTimestamp > lastUpdatedTime;
      });
    }

    return NextResponse.json(schedules);
  } catch (error: any) {
    console.error('GET Error:', error);
    return NextResponse.json({ message: '스케줄 정보를 가져오는 중 서버 오류가 발생했습니다.', error: error.message }, {status: 500});
  }
}

export async function POST(request: Request) {
  try {
    const newSchedule = await request.json();
    // Basic validation for the new schedule might be needed here
    if (!newSchedule || typeof newSchedule.id !== 'string' || typeof newSchedule.supplement !== 'string' || typeof newSchedule.day !== 'string' || typeof newSchedule.time !== 'string') {
        return NextResponse.json({ message: '잘못된 스케줄 데이터 형식입니다.' }, { status: 400 });
    }
    const schedules = await readSchedules();
    schedules.push(newSchedule);
    await writeSchedules(schedules);
    return NextResponse.json(newSchedule, {status: 201});
  } catch (error: any) {
    console.error('POST Error:', error);
    return NextResponse.json({ message: '스케줄을 추가하는 중 서버 오류가 발생했습니다.', error: error.message }, {status: 500});
  }
}

