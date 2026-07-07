const { MongoClient } = require('mongodb');
require('dotenv').config();

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in environment');
    process.exit(1);
  }

  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db();

    const filter = { email: { $regex: /@example/i } };
    const update = { $set: { emailVerified: true } };

    console.log('Searching for users with email matching /@example/i...');
    const matched = await db.collection('users').countDocuments(filter);
    console.log(`Found ${matched} matching users.`);

    if (matched === 0) {
      console.log('Nothing to update. Exiting.');
      return;
    }

    const res = await db.collection('users').updateMany(filter, update);
    console.log(`updateMany result: matched=${res.matchedCount}, modified=${res.modifiedCount}`);

    const samples = await db.collection('users').find(filter).limit(10).project({ email: 1, emailVerified: 1 }).toArray();
    console.log('Sample updated documents:', samples);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(2);
  } finally {
    await client.close();
  }
}

main();
