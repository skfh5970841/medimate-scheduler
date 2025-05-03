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
    return new NextResponse('Internal Server Error reading mapping', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const newMappingData = await request.json();
    // Validate incoming data - should be an object
    if (typeof newMappingData !== 'object' || newMappingData === null) {
        return new NextResponse('Invalid mapping data format', { status: 400 });
    }

    const existingMapping = await readMapping();
    // Merge new data into existing mapping
    const updatedMapping = { ...existingMapping, ...newMappingData };
    await writeMapping(updatedMapping);
    // Return the part that was just updated/added
    return NextResponse.json(newMappingData, { status: 201 });
  } catch (error: any) {
    console.error('POST Error:', error);
    return new NextResponse('Internal Server Error updating mapping', { status: 500 });
  }
}

export async function DELETE(request: NextRequest) { // Use NextRequest here
  try {
    const { searchParams } = new URL(request.url);
    const supplementName = searchParams.get('supplementName'); // Get from query param

    if (!supplementName) {
        return new NextResponse('Missing supplementName query parameter', { status: 400 });
    }

    const existingMapping = await readMapping();

    if (!(supplementName in existingMapping)) {
        return new NextResponse(`Mapping for '${supplementName}' not found`, { status: 404 });
    }

    delete existingMapping[supplementName]; // Delete the specific mapping
    await writeMapping(existingMapping);

    return NextResponse.json({ message: `Mapping for ${supplementName} deleted successfully` });
  } catch (error: any) {
    console.error('DELETE Error:', error);
    return new NextResponse('Internal Server Error deleting mapping', { status: 500 });
  }
}
