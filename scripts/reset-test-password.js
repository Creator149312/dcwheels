const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function main() {
  const uri = 'mongodb+srv://gauravsingh9314:CgGuad6gkQVreJAx@cluster0.6vbs3ay.mongodb.net/spinpapa_dbprod';
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Dharam@1@', salt);
    
    const db = client.db();
    const result = await db.collection('users').updateOne(
      { email: 'dharamveer@email.com' },
      { $set: { password: hash } }
    );
    
    console.log('Update result:', result);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await client.close();
  }
}

main();