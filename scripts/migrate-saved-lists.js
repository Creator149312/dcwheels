const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const ListSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  name: String,
  isSystem: Boolean,
  systemKey: String,
  description: String,
  items: Array,
  settings: Object
}, { timestamps: true });

// Match the production collection name
const COLLECTION_NAME = 'unifiedlists';

async function migrateAllUsers() {
  console.log('--- Starting Global "Saved" List Migration ---');
  
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    const UnifiedList = mongoose.models.UnifiedList || mongoose.model('UnifiedList', ListSchema, COLLECTION_NAME);
    const User = mongoose.model('User', new mongoose.Schema({}), 'users');

    // 1. Get all user IDs
    const users = await User.find({}).select('_id').lean();
    console.log(`Found ${users.length} total users to process.\n`);

    let createdCount = 0;
    let upgradedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < users.length; i++) {
        const userId = users[i]._id;
        
        try {
            // Check if user already has the system list
            let savedList = await UnifiedList.findOne({ userId, systemKey: 'SYS_SAVED' });
            
            if (savedList) {
                skippedCount++;
            } else {
                // Check for legacy "Saved" list (case-insensitive)
                savedList = await UnifiedList.findOne({ 
                    userId, 
                    name: { $regex: /^saved$/i } 
                });

                if (savedList) {
                    // UPGRADE existing list
                    savedList.isSystem = true;
                    savedList.systemKey = 'SYS_SAVED';
                    savedList.name = 'Saved';
                    if (!savedList.description) {
                        savedList.description = 'Default list for items you\'ve saved.';
                    }
                    await savedList.save();
                    upgradedCount++;
                } else {
                    // CREATE new system list
                    await UnifiedList.create({
                        userId,
                        name: 'Saved',
                        description: 'Default list for items you\'ve saved.',
                        isSystem: true,
                        systemKey: 'SYS_SAVED',
                        items: [],
                        settings: { visibility: 'private', sortBy: 'recently-saved' }
                    });
                    createdCount++;
                }
            }
        } catch (err) {
            // Catch duplicate key errors just in case
            if (err.code === 11000) {
                skippedCount++;
            } else {
                console.error(`Error processing user ${userId}:`, err.message);
                errorCount++;
            }
        }

        // Progress update every 100 users
        if ((i + 1) % 100 === 0) {
            console.log(`Processed ${i + 1}/${users.length} users...`);
        }
    }

    console.log('\n--- Migration Complete ---');
    console.log(`Created new lists:  ${createdCount}`);
    console.log(`Upgraded legacy:    ${upgradedCount}`);
    console.log(`Already up-to-date: ${skippedCount}`);
    console.log(`Errors:             ${errorCount}`);

    process.exit(0);
  } catch (err) {
    console.error('CRITICAL MIGRATION ERROR:', err);
    process.exit(1);
  }
}

migrateAllUsers();
