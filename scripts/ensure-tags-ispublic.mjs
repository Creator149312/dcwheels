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
    
    // Explicitly set isPublic: true for ALL tags in the collection
    const result = await db.collection('tags').updateMany(
      {}, 
      { $set: { isPublic: true } }
    );
    console.log('Successfully set isPublic: true for all tags:', result);
  } catch (err) {
    console.error('Error setting isPublic:', err);
  } finally {
    await c.close();
  }
}
run();
