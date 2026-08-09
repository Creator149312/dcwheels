const mongoose = require('mongoose');
require('dotenv').config();

const TagSchema = new mongoose.Schema({
  slug: String,
  isPublic: Boolean,
}, { collection: 'tags', strict: false });

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const Tag = mongoose.models.Tag || mongoose.model('Tag', TagSchema);
    
    // 1. Find counts
    const missingPublic = await Tag.countDocuments({ isPublic: { $exists: false } });
    console.log(`Tags missing isPublic field: ${missingPublic}`);

    if (missingPublic > 0) {
      const result = await Tag.updateMany(
        { isPublic: { $exists: false } },
        { $set: { isPublic: true } }
      );
      console.log('Update result:', result);
    }

    await mongoose.disconnect();
    console.log('Done');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
