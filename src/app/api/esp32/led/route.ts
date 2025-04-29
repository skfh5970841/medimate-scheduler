import {NextResponse} from 'next/server';

// IMPORTANT: Replace with the actual IP address or hostname of your ESP32
const ESP32_IP_ADDRESS = process.env.ESP32_IP_ADDRESS || 'http://192.168.1.100'; // Default to a common local IP, use environment variable

export async function POST(request: Request) {
  try {
    const { state } = await request.json(); // Expecting { "state": "on" | "off" }

    if (state !== 'on' && state !== 'off') {
      return NextResponse.json({ message: 'Invalid state. Must be "on" or "off".' }, { status: 400 });
    }

    console.log(`Forwarding LED control request to ESP32: ${state.toUpperCase()}`);

    // --- Communicate with ESP32 ---
    // Adjust the endpoint and method based on your ESP32's API design.
    // Example: ESP32 has an endpoint `/led` that accepts POST requests
    const esp32Endpoint = `${ESP32_IP_ADDRESS}/led`;

    const espResponse = await fetch(esp32Endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ state }), // Send the state to the ESP32
      // Add a timeout to prevent hanging requests
      signal: AbortSignal.timeout(5000) // 5 seconds timeout
    });

    if (!espResponse.ok) {
        // Try to get more specific error from ESP32 response
        const espErrorText = await espResponse.text().catch(() => 'Could not read ESP32 error response');
        console.error(`ESP32 responded with status ${espResponse.status}: ${espErrorText}`);
        throw new Error(`ESP32 control failed with status ${espResponse.status}. ${espErrorText}`);
    }

    // Optionally process the ESP32's response if it sends one
    // const espResult = await espResponse.json();
    // console.log("ESP32 Response:", espResult);


    return NextResponse.json({ message: `LED successfully turned ${state}` }, { status: 200 });

  } catch (error: any) {
    console.error('Error controlling ESP32 LED:', error);

    let errorMessage = 'Internal Server Error';
    let statusCode = 500;

    if (error.name === 'AbortError') {
        errorMessage = 'Request to ESP32 timed out.';
        statusCode = 504; // Gateway Timeout
    } else if (error.message?.includes('fetch failed') || error.code === 'ECONNREFUSED') {
         errorMessage = 'Could not connect to ESP32. Is it online and reachable?';
         statusCode = 502; // Bad Gateway
    } else if (error.message?.includes('ESP32 control failed')) {
        errorMessage = error.message; // Use the specific error from ESP32 response
        statusCode = 502; // Bad Gateway or specific status if parsed
    }


    return NextResponse.json({ message: errorMessage }, { status: statusCode });
  }
}
