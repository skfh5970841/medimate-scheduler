
import { NextResponse, NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Supplement {
  id: string;
  name: string;
}

interface Schedule {
  id: string;
  supplement: string;
  day: string;
  time: string;
  timestamp?: number;
}

interface Mapping {
  [key: string]: number;
}

const supplementsFilePath = path.join(process.cwd(), 'src/data', 'supplements.json');
const schedulesFilePath = path.join(process.cwd(), 'src/data', 'schedules.json');
const mappingFilePath = path.join(process.cwd(), 'src/data', 'mapping.json');

async function readData<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    if (!fileContent.trim()) return defaultValue;
    return JSON.parse(fileContent) as T;
  } catch (error: any) {
    if (error.code === 'ENOENT') return defaultValue;
    console.error(`Error reading ${path.basename(filePath)}:`, error);
    return defaultValue;
  }
}

async function writeData<T>(filePath: string, data: T): Promise<void> {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing ${path.basename(filePath)}:`, error);
    throw new Error(`Failed to write data to ${path.basename(filePath)}.`);
  }
}

export async function GET() {
  try {
    const supplements = await readData<Supplement[]>(supplementsFilePath, []);
    return NextResponse.json(supplements);
  } catch (error: any) {
    console.error('GET /api/supplements Error:', error);
    return NextResponse.json({ message: '영양제 정보를 읽어오는 중 서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const newSupplement: Supplement = await request.json();

    if (!newSupplement.id || !newSupplement.name) {
      return NextResponse.json({ message: '영양제 ID와 이름은 필수입니다.' }, { status: 400 });
    }

    const supplements = await readData<Supplement[]>(supplementsFilePath, []);

    if (supplements.some(s => s.id === newSupplement.id)) {
      return NextResponse.json({ message: `'${newSupplement.id}' ID를 가진 영양제가 이미 존재합니다.` }, { status: 409 });
    }
    if (supplements.some(s => s.name === newSupplement.name)) {
      return NextResponse.json({ message: `'${newSupplement.name}' 이름을 가진 영양제가 이미 존재합니다.` }, { status: 409 });
    }

    supplements.push(newSupplement);
    await writeData(supplementsFilePath, supplements);

    return NextResponse.json(newSupplement, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/supplements Error:', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: '잘못된 JSON 형식입니다.' }, { status: 400 });
    }
    return NextResponse.json({ message: error.message || '영양제 추가 중 서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplementIdToDelete = searchParams.get('id');

    if (!supplementIdToDelete) {
      return NextResponse.json({ message: '삭제할 영양제 ID가 필요합니다.' }, { status: 400 });
    }

    // Check if the supplement is used in schedules or mappings
    const schedules = await readData<Schedule[]>(schedulesFilePath, []);
    const supplementsList = await readData<Supplement[]>(supplementsFilePath, []);
    const supplementNameToDelete = supplementsList.find(s => s.id === supplementIdToDelete)?.name;

    if (schedules.some(s => s.supplement === supplementIdToDelete || (supplementNameToDelete && s.supplement === supplementNameToDelete) )) {
      return NextResponse.json({ message: `해당 영양제('${supplementNameToDelete || supplementIdToDelete}')가 하나 이상의 스케줄에서 사용 중이므로 삭제할 수 없습니다.` }, { status: 409 });
    }

    const mappings = await readData<Mapping>(mappingFilePath, {});
    if (supplementNameToDelete && mappings.hasOwnProperty(supplementNameToDelete)) {
      return NextResponse.json({ message: `해당 영양제('${supplementNameToDelete}')가 디스펜서 매핑에서 사용 중이므로 삭제할 수 없습니다.` }, { status: 409 });
    }
    if (mappings.hasOwnProperty(supplementIdToDelete)) {
         return NextResponse.json({ message: `해당 영양제 ID('${supplementIdToDelete}')가 디스펜서 매핑에서 사용 중이므로 삭제할 수 없습니다.` }, { status: 409 });
    }

    let supplements = await readData<Supplement[]>(supplementsFilePath, []);
    const initialLength = supplements.length;
    supplements = supplements.filter(s => s.id !== supplementIdToDelete);

    if (supplements.length === initialLength) {
      return NextResponse.json({ message: `ID '${supplementIdToDelete}'에 해당하는 영양제를 찾을 수 없습니다.` }, { status: 404 });
    }

    await writeData(supplementsFilePath, supplements);

    return NextResponse.json({ message: `영양제 '${supplementNameToDelete || supplementIdToDelete}'이(가) 성공적으로 삭제되었습니다.` });
  } catch (error: any) {
    console.error('DELETE /api/supplements Error:', error);
    return NextResponse.json({ message: error.message || '영양제 삭제 중 서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
