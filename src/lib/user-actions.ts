'use server';

import { promises as fs } from 'fs';
import path from 'path';

const usersFilePath = path.join(process.cwd(), 'src/data/users.json');

export async function readUsers(): Promise<{ username: string; password: string }[]> {
  try {
    const data = await fs.readFile(usersFilePath, 'utf8');
    return JSON.parse(data) as { username: string; password: string }[];
  } catch (err) {
    console.error('Error reading users data:', err);
    return [];
  }
}

export async function writeUsers(users: { username: string; password: string }[]) {
  try {
    await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing users data:', err);
    throw err; // Re-throw to handle in the component
  }
}


export async function registerUser(username: string, password: string): Promise<void> {
    const users = await readUsers();
    if (users.some((u) => u.username === username)) {
      throw new Error('Username already exists.');
    }

    const updatedUsers = [...users, {username, password}];
    await writeUsers(updatedUsers);
}
