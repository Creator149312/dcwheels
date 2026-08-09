import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "spinpapa_dbprod";

async function run() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is missing");
    process.exit(1);
  }
  const c = new MongoClient(MONGODB_URI);
  try {
    await c.connect();
    const db = c.db(DB_NAME);
    const result = await db.collection('tags').updateMany({}, { $unset: { isPublic: '' } });
    console.log('Unset isPublic field result:', result);
  } finally {
    await c.close();
  }
}
run();
