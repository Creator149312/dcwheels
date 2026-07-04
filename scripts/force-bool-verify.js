const { MongoClient } = require('mongodb');

async function main() {
  const uri = "mongodb+srv://gauravsingh9314:CgGuad6gkQVreJAx@cluster0.6vbs3ay.mongodb.net/spinpapa_dbprod";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const result = await db.collection('users').updateOne(
      { email: 'dharamveer@email.com' },
      { $set: { emailVerified: true } }
    );
    console.log('Update result:', result);
    const user = await db.collection('users').findOne({ email: 'dharamveer@email.com' });
    console.log('Final emailVerified:', user.emailVerified, typeof user.emailVerified);
  } finally {
    await client.close();
  }
}
main();