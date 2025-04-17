import {NextResponse} from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Received data for Arduino:', data);

    // TODO: Implement the logic to communicate with the Arduino device here.
    // This might involve sending data over a serial connection,
    // using a network protocol like MQTT, or any other method
    // appropriate for your setup.

    return NextResponse.json({message: 'Arduino triggered successfully'}, {status: 200});
  } catch (error: any) {
    console.error('Error triggering Arduino:', error);
    return new NextResponse('Internal Server Error', {status: 500});
  }
}
