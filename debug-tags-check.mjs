import { MongoClient } from 'mongodb';

const MONGODB_URI = "mongodb+srv://admin:admin@lucifer.013sk.mongodb.net/spinpapa_dbprod?retryWrites=true&w=majority";

async function checkTags() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('spinpapa_dbprod');
    
    const tagsToCheck = ['sports', 'games'];
    
    for (const tag of tagsToCheck) {
      console.log(`\nChecking tag: ${tag}`);
      
      const wheelCount = await db.collection('wheels').countDocuments({ tags: tag, isPublic: true, isDeleted: false });
      const postCount = await db.collection('posts').countDocuments({ tags: tag, isPublic: true, isDeleted: false, shadowBanned: false });
      const listCount = await db.collection('unifiedlists').countDocuments({ tags: tag, isSystem: { $ne: true }, $or: [{ isPublic: true }, { "settings.visibility": "public" }] });
      const tagDoc = await db.collection('tags').findOne({ slug: tag });
      
      console.log(`- Wheels: ${wheelCount}`);
      console.log(`- Posts: ${postCount}`);
      console.log(`- Lists: ${listCount}`);
      console.log(`- TagDoc: ${tagDoc ? JSON.stringify(tagDoc) : 'null'}`);
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

checkTags();
