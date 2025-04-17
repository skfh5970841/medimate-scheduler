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
  // TODO: Implement this by calling an API.

  return [];
}
