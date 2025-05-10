/**
 * Represents a supplement with its unique identifier and name.
 */
export interface Supplement {
  /**
   * The unique identifier of the supplement.
   */
  id: string;
  /**
   * The name of the supplement.
   */
  name: string;
}

/**
 * Asynchronously retrieves a list of available supplements.
 *
 * @returns A promise that resolves to an array of Supplement objects.
 */
export async function getSupplements(): Promise<Supplement[]> {
  // TODO: Later, this could be implemented by calling an API or reading from a database.
  // For now, we'll read from a local JSON file.
  try {
    // Assuming supplements.json is in the src/data directory and accessible
    // For a real-world scenario, you'd use a proper file reading mechanism
    // (e.g., fs.readFile in Node.js or fetch in a browser environment if the file is served).
    // Since this is a TypeScript file in a Next.js like project, 
    // we might need to adjust how the file is imported or fetched.
    // For simplicity, let's assume the file content can be directly imported or fetched.
    // This is a placeholder for actual file reading logic.
    const supplementsData = await import('../data/supplements.json');
    return supplementsData.default || supplementsData;
  } catch (error) {
    console.error("Failed to load supplements:", error);
    return [];
  }
}
