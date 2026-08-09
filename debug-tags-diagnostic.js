const mongoose = require('mongoose');
require('dotenv').config();

// Define schemas manually to avoid import issues
const TagSchema = new mongoose.Schema({
  slug: String,
  displayName: String,
  isPublic: Boolean,
  aliases: [String],
  wheelCount: Number,
  askCount: Number,
  listCount: Number
}, { collection: 'tags' });

const PostSchema = new mongoose.Schema({
  tags: [String],
  isPublic: Boolean,
  isDeleted: Boolean,
  shadowBanned: Boolean
}, { collection: 'posts' });

const WheelSchema = new mongoose.Schema({
  tags: [String],
  isPublic: Boolean,
  isDeleted: Boolean
}, { collection: 'wheels' });

const UnifiedListSchema = new mongoose.Schema({
  tags: [String],
  isPublic: Boolean,
  isSystem: Boolean,
  settings: { visibility: String }
}, { collection: 'unifiedlists' });

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const Tag = mongoose.models.Tag || mongoose.model('Tag', TagSchema);
    const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);
    const Wheel = mongoose.models.Wheel || mongoose.model('Wheel', WheelSchema);
    const UnifiedList = mongoose.models.UnifiedList || mongoose.model('UnifiedList', UnifiedListSchema);

    const checkTags = ['sports', 'games'];

    for (const slug of checkTags) {
      console.log(`--- Checking tag: ${slug} ---`);
      
      const tagDoc = await Tag.findOne({
        $or: [{ slug: slug }, { aliases: slug }],
      }).lean();
      
      console.log('Tag Document:', JSON.stringify(tagDoc, null, 2));
      console.log(`  isPublic field: ${tagDoc?.isPublic}`);
      console.log(`  has isPublic property: ${tagDoc && Object.prototype.hasOwnProperty.call(tagDoc, 'isPublic')}`);

      const [postCount, wheelCount, listCount] = await Promise.all([
        Post.countDocuments({ tags: slug, isPublic: true, shadowBanned: { $ne: true } }),
        Wheel.countDocuments({ tags: slug, isPublic: true }),
        UnifiedList.countDocuments({ 
          tags: slug, 
          isSystem: false, 
          $or: [{ 'settings.visibility': 'public' }, { isPublic: true }] 
        })
      ]);

      console.log(`Content Counts for "${slug}":`);
      console.log(`  Posts (isPublic:true, !shadowBanned): ${postCount}`);
      console.log(`  Wheels (isPublic:true): ${wheelCount}`);
      console.log(`  Lists: ${listCount}`);
      console.log(`  Total: ${postCount + wheelCount + listCount}`);
      
      const exampleWheel = await Wheel.findOne({ tags: slug }).lean();
      if (exampleWheel) {
        console.log(`  Sample Wheel matching "${slug}":`, JSON.stringify(exampleWheel, null, 2));
      } else {
        const insensitiveWheel = await Wheel.findOne({ tags: { $regex: new RegExp(`^${slug}$`, 'i') } }).lean();
        if (insensitiveWheel) {
          console.log(`  Found content with case-insensitive match:`, JSON.stringify(insensitiveWheel, null, 2));
        }
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
