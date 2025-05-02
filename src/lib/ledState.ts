'use server';

import { promises as fs } from 'fs';
import path from 'path';

const stateFilePath = path.join(process.cwd(), 'src/data', 'ledState.json');

type LedState = 'on' | 'off';

interface StateData {
  state: LedState;
  lastUpdated: string;
}

// Initialize file if it doesn't exist
const initializeStateFile = async () => {
  try {
    // Check if the directory exists, create if not
    const dirPath = path.dirname(stateFilePath);
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
    }

    // Check if the file exists
    await fs.access(stateFilePath);
  } catch {
    // File doesn't exist, create it with default state 'off'
    const defaultState: StateData = { state: 'off', lastUpdated: new Date().toISOString() };
    try {
      await fs.writeFile(stateFilePath, JSON.stringify(defaultState, null, 2), 'utf8');
      console.log('Initialized ledState.json');
    } catch (writeError) {
        console.error('Failed to initialize ledState.json:', writeError);
        // If initialization fails, throw error to prevent further operations
        throw new Error('Failed to initialize state file.');
    }
  }
};

// Call initializeStateFile at the start, but handle potential errors
initializeStateFile().catch(error => {
  console.error("Error during initial state file check/creation:", error);
  // Depending on the severity, you might want to prevent the server from starting
  // or handle this state gracefully later.
});


/**
 * Reads the current desired LED state from the file.
 * Defaults to 'off' if the file cannot be read or parsed.
 * @returns The current desired LED state ('on' or 'off').
 */
export async function getLedState(): Promise<LedState> {
  try {
    await initializeStateFile(); // Ensure file exists before reading
    const fileContent = await fs.readFile(stateFilePath, 'utf8');
    const data: StateData = JSON.parse(fileContent);
    // Basic validation
    if (data.state === 'on' || data.state === 'off') {
      return data.state;
    }
    console.warn('Invalid state found in ledState.json, defaulting to "off".');
    return 'off'; // Default to 'off' if state is invalid
  } catch (error) {
    console.error('Error reading LED state file:', error);
    // Attempt to re-initialize if reading failed badly
    await initializeStateFile().catch(initError => console.error("Failed to re-initialize state file after read error:", initError));
    return 'off'; // Default to 'off' in case of any error
  }
}

/**
 * Writes the new desired LED state to the file.
 * @param newState The desired state ('on' or 'off').
 */
export async function setLedState(newState: LedState): Promise<void> {
  try {
    await initializeStateFile(); // Ensure file exists before writing
    const data: StateData = {
      state: newState,
      lastUpdated: new Date().toISOString(),
    };
    await fs.writeFile(stateFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing LED state file:', error);
    throw error; // Re-throw the error to be handled by the API route
  }
}
