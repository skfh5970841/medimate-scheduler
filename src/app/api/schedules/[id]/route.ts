import {NextResponse} from 'next/server';
import {promises as fs} from 'fs';
import path from 'path';
import {Schedule} from '@/types';

const dataFilePath = path.join(process.cwd(), 'src/data', 'schedules.json');

async function readSchedules(): Promise<Schedule[]> {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error: any) {
    console.error('Error reading schedules from file:', error);
    return [];
  }
}

async function writeSchedules(schedules: Schedule[]): Promise<void> {
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
    const schedules = await readSchedules();
    const updatedSchedules = schedules.filter(schedule => schedule.id !== id);
    await writeSchedules(updatedSchedules);
    return NextResponse.json({message: 'Schedule deleted successfully'}, {status: 200});
  } catch (error: any) {
    console.error('DELETE Error:', error);
    return new NextResponse('Internal Server Error', {status: 500});
  }
}
