import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'app-db.json');

const DEFAULT_DB = {
  users: [],
  settings: [],
  jobs: [],
};

const ensureDb = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
  }
};

export const readDb = async () => {
  await ensureDb();
  const raw = await fs.readFile(DB_PATH, 'utf-8');
  const parsed = JSON.parse(raw || '{}');
  return {
    ...DEFAULT_DB,
    ...parsed,
    users: Array.isArray(parsed.users) ? parsed.users : [],
    settings: Array.isArray(parsed.settings) ? parsed.settings : [],
    jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
  };
};

export const writeDb = async (nextDb) => {
  await ensureDb();
  await fs.writeFile(DB_PATH, JSON.stringify(nextDb, null, 2), 'utf-8');
};

export const updateDb = async (updater) => {
  const current = await readDb();
  const updated = await updater(structuredClone(current));
  await writeDb(updated);
  return updated;
};
