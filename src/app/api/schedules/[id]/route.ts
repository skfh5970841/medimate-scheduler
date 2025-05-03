
import {NextResponse} from 'next/server';
import {promises as fs} from 'fs';
import path from 'path';
import {Schedule} from '@/types';

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

interface Params {
  id: string;
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
    return NextResponse.json({message: '스케줄이 성공적으로 삭제되었습니다.'}, {status: 200}); // Use Korean message on success
  } catch (error: any) {
    console.error('DELETE Error:', error);
    // Return JSON error response
    return NextResponse.json({ message: '스케줄 삭제 중 서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
