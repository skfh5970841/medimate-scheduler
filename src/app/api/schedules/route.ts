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

export async function GET(request: Request) {
  try {
    const {searchParams} = new URL(request.url);
    const lastUpdated = searchParams.get('lastUpdated');

    let schedules = await readSchedules();

    if (lastUpdated) {
      const lastUpdatedTime = new Date(lastUpdated).getTime();
      schedules = schedules.filter(schedule => {
        // Assuming schedule.id contains a timestamp part (e.g., "1744943954408-Monday")
        const scheduleTimestamp = new Date(parseInt(schedule.id.split('-')[0])).getTime();
        return scheduleTimestamp > lastUpdatedTime;
      });
    }

    return NextResponse.json(schedules);
  } catch (error: any) {
    console.error('GET Error:', error);
    return new NextResponse('Internal Server Error', {status: 500});
  }
}

export async function POST(request: Request) {
  try {
    const newSchedule = await request.json();
    const schedules = await readSchedules();
    schedules.push(newSchedule);
    await writeSchedules(schedules);
    return NextResponse.json(newSchedule, {status: 201});
  } catch (error: any) {
    console.error('POST Error:', error);
    return new NextResponse('Internal Server Error', {status: 500});
  }
}
