// 파일 경로: src/app/api/esp32/quantity/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Data file paths
const supplementsFilePath = path.join(process.cwd(), 'src/data', 'supplements.json');

// 타입 정의
interface Supplement {
  id: string;
  name: string;
  quantity: number; // 현재 남은 수량
  // ... other properties if they exist
}

// GET: ESP32가 이 경로로 쿼리 파라미터를 통해 약물 잔량을 전송하면, 서버에서 해당 정보를 기록합니다.
export async function GET(request: NextRequest) {
  try {
    const supplementName = request.nextUrl.searchParams.get('supplementName');
    const remainingQuantityParam = request.nextUrl.searchParams.get('remainingQuantity');

    if (!supplementName || !remainingQuantityParam) {
      console.log('[API /api/esp32/quantity GET] Missing supplementName or remainingQuantity parameter.');
      return NextResponse.json({ error: 'Missing supplementName or remainingQuantity parameter' }, { status: 400 });
    }

    const remainingQuantity = parseInt(remainingQuantityParam, 10);
    if (isNaN(remainingQuantity)) {
      console.warn(`[API /api/esp32/quantity GET] Invalid remainingQuantity received: ${remainingQuantityParam} for ${supplementName}`);
      return NextResponse.json({ error: 'Invalid remainingQuantity format. Must be a number.' }, { status: 400 });
    }

    console.log(`[API /api/esp32/quantity GET] Received supplement quantity update: ${supplementName} - Remaining: ${remainingQuantity}`);
    
    let supplements: Supplement[];
    try {
      const supplementsFileContent = await fs.readFile(supplementsFilePath, 'utf8');
      supplements = supplementsFileContent.trim() ? JSON.parse(supplementsFileContent) as Supplement[] : [];
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('[API /api/esp32/quantity GET] supplements.json not found. Cannot update quantity.');
        return NextResponse.json({ error: 'Supplements data file not found.' }, { status: 500 });
      } else {
        console.error('[API /api/esp32/quantity GET] Error reading or parsing supplements.json:', error);
        return NextResponse.json({ error: 'Error reading supplements data.' }, { status: 500 });
      }
    }

    const supplementIndex = supplements.findIndex(s => s.name === supplementName);

    if (supplementIndex !== -1) {
      supplements[supplementIndex].quantity = remainingQuantity;
      try {
        await fs.writeFile(supplementsFilePath, JSON.stringify(supplements, null, 2));
        console.log(`[API /api/esp32/quantity GET] Updated ${supplementName} quantity to ${remainingQuantity} in supplements.json`);
        return NextResponse.json({ message: `Successfully updated ${supplementName} quantity to ${remainingQuantity}.` }, { status: 200 });
      } catch (writeError) {
        console.error(`[API /api/esp32/quantity GET] Error writing updated supplements.json:`, writeError);
        return NextResponse.json({ error: 'Error saving updated supplement quantity.' }, { status: 500 });
      }
    } else {
      console.warn(`[API /api/esp32/quantity GET] Supplement ${supplementName} not found in supplements.json. Cannot update quantity.`);
      return NextResponse.json({ error: `Supplement ${supplementName} not found.` }, { status: 404 });
    }

  } catch (error: any) {
    console.error('[API /api/esp32/quantity GET] Error processing request:', error);
    return NextResponse.json({ error: "Internal server error while processing quantity update.", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
