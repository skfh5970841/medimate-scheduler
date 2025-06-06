
import { NextResponse, NextRequest } from 'next/server'; // Import NextRequest
import { promises as fs } from 'fs';
import path from 'path';

type Mapping = {
  [key: string]: number;
};
const dataFilePath = path.join(process.cwd(), 'src/data', 'mapping.json');
const dataDir = path.dirname(dataFilePath);

// Function to ensure the data directory exists
async function ensureDirectoryExists() {
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
}

async function readMapping(): Promise<Mapping> {
  await ensureDirectoryExists(); // Ensure directory exists before reading
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf8');
    // Handle empty file case
    if (!fileContent.trim()) {
      return {};
    }
    const mapping: Mapping = JSON.parse(fileContent);
    return mapping;
  } catch (error: any) {
    // If the file doesn't exist or is empty/invalid, return an empty object
    if (error.code === 'ENOENT') {
      return {}; // Return empty if file not found
    }
    console.error('Error reading mapping.json:', error);
    return {}; // Return empty for other errors too, maybe log them
  }
}

async function writeMapping(mapping: Mapping): Promise<void> {
  await ensureDirectoryExists(); // Ensure directory exists before writing
  try {
    await fs.writeFile(dataFilePath, JSON.stringify(mapping, null, 2), 'utf8');
  } catch (error: any) {
    console.error('Error writing mapping.json:', error);
    throw error;
  }
}

export async function GET() {
  try {
    const mapping = await readMapping();
    return NextResponse.json(mapping);
  } catch (error: any) {
    console.error('GET Error reading mapping:', error);
    // Return JSON error response
    return NextResponse.json({ message: '매핑 정보 읽기 중 서버 오류 발생' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newMappingData = await request.json();
    // Validate incoming data - should be an object
    if (typeof newMappingData !== 'object' || newMappingData === null || Object.keys(newMappingData).length === 0) {
        return NextResponse.json({ message: '유효하지 않은 매핑 데이터 형식입니다.' }, { status: 400 });
    }

    const existingMapping = await readMapping();
    // Merge new data into existing mapping
    const updatedMapping = { ...existingMapping, ...newMappingData };
    await writeMapping(updatedMapping);
    // Return the part that was just updated/added
    return NextResponse.json(newMappingData, { status: 201 });
  } catch (error: any) {
    console.error('POST Error updating mapping:', error);
    // Return JSON error response
    return NextResponse.json({ message: '매핑 업데이트 중 서버 오류 발생' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) { // Use NextRequest here
  try {
    const { searchParams } = new URL(request.url);
    const supplementName = searchParams.get('supplementName'); // Get from query param

    // If supplementName is provided, delete only that mapping
    if (supplementName) {
        const existingMapping = await readMapping();

        if (!(supplementName in existingMapping)) {
            return NextResponse.json({ message: `'${supplementName}'에 대한 매핑을 찾을 수 없습니다.` }, { status: 404 });
        }

        delete existingMapping[supplementName]; // Delete the specific mapping
        await writeMapping(existingMapping);

        return NextResponse.json({ message: `'${supplementName}' 매핑이 성공적으로 삭제되었습니다.` });
    } else {
        // If supplementName is NOT provided, reset all mappings (delete the file content)
        await writeMapping({}); // Write an empty object to reset
        return NextResponse.json({ message: `모든 매핑이 성공적으로 초기화되었습니다.` });
    }

  } catch (error: any) {
    console.error('DELETE Error processing mapping delete request:', error);
    // Return JSON error response
    return NextResponse.json({ message: '매핑 삭제 요청 처리 중 서버 오류 발생' }, { status: 500 });
  }
}
