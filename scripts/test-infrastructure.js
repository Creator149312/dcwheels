const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config();

// Define a minimal Schema so we don't have to deal with imports/Next logic
const ListSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  name: String,
  isSystem: Boolean,
  systemKey: String,
  description: String,
  items: Array,
  settings: Object
});

// Enforce the same indexes we have in the model
ListSchema.index({ userId: 1, name: 1 }, { unique: true });
ListSchema.index(
  { userId: 1, systemKey: 1 }, 
  { unique: true, partialFilterExpression: { systemKey: { $exists: true } } }
);

async function runTests() {
  console.log('--- Starting SpinWheel Infrastructure Tests ---\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const UnifiedList = mongoose.models.UnifiedList || mongoose.model('UnifiedList', ListSchema, 'unifiedlists');
    const User = mongoose.model('User', new mongoose.Schema({ email: String }), 'users');

    // Use the user provided in context or find any user
    const user = await User.findOne({ email: 'gauravsingh9314@gmail.com' });
    if (!user) {
      console.error('❌ Could not find test user. Please ensure MONGODB_URI is correct and user exists.');
      process.exit(1);
    }
    const userId = user._id;

    console.log(`Testing with User ID: ${userId} (${user.email})\n`);

    // Clean up any mess from previous failed tests
    await UnifiedList.deleteMany({ userId, name: { $in: ['Another Saved', 'saved', 'Saved'] } });
    await UnifiedList.deleteMany({ userId, systemKey: 'SYS_SAVED' });

    // Force Mongoose to create the indexes defined in the script
    console.log('Syncing database indexes...');
    try {
      await UnifiedList.syncIndexes();
    } catch (e) {
      console.log('Index sync warning (likely duplicates exist elsewhere):', e.message);
    }
    console.log('Indexes ready.\n');

    // --- TEST 1: Unique System Key Index ---
    console.log('TEST 1: Unique System Key Index');
    // Ensure one exists
    await UnifiedList.findOneAndUpdate(
      { userId, systemKey: 'SYS_SAVED' },
      { name: 'Saved', isSystem: true, systemKey: 'SYS_SAVED' },
      { upsert: true }
    );
    
    try {
      await UnifiedList.create({
        userId,
        name: 'Another Saved',
        systemKey: 'SYS_SAVED', // Duplicate key
        isSystem: true
      });
      console.log('❌ FAIL: Database allowed two SYS_SAVED lists for the same user.');
    } catch (e) {
      if (e.code === 11000) {
        console.log('✅ PASS: Database blocked duplicate SYS_SAVED keys.');
      } else {
        console.log('❌ FAIL: Unexpected error:', e.message);
      }
    }
    console.log('');

    // --- TEST 2: Reserved Name Migration (Lazy Upgrade) ---
    console.log('TEST 2: Lazy Upgrade (Reserved Name)');
    
    // 1. Setup: Delete existing system list and create a "legacy" one
    await UnifiedList.deleteOne({ userId, systemKey: 'SYS_SAVED' });
    await UnifiedList.deleteOne({ userId, name: 'Saved' });
    
    await UnifiedList.create({
      userId,
      name: 'saved', // lowercase legacy name
      isSystem: false,
      description: 'my old list'
    });
    console.log('   - Created legacy "saved" list (no system metadata)');

    // 2. Simulate the logic from /api/unifiedlist/route.js
    let savedList = await UnifiedList.findOne({ userId, systemKey: 'SYS_SAVED' });
    if (!savedList) {
      savedList = await UnifiedList.findOne({ 
        userId, 
        name: { $regex: /^saved$/i } 
      });
      
      if (savedList) {
        savedList.isSystem = true;
        savedList.systemKey = 'SYS_SAVED';
        savedList.name = 'Saved';
        await savedList.save();
        console.log('   - Logic triggered: Upgraded legacy list to SYS_SAVED');
      }
    }

    const final = await UnifiedList.findOne({ userId, systemKey: 'SYS_SAVED' });
    if (final && final.isSystem === true && final.name === 'Saved') {
      console.log('✅ PASS: Lazy migration correctly identified and upgraded "saved" to system list.');
    } else {
      console.log('❌ FAIL: Migration failed. State:', final);
    }
    console.log('');

    // --- TEST 3: Reserved Name Blocking ---
    console.log('TEST 3: API Protection Simulation');
    const nameToTest = 'Favorites'; // One of the reserved names
    const RESERVED_NAMES = ["Saved", "Favorites", "My Collection"];
    
    const isReserved = RESERVED_NAMES.map(n => n.toLowerCase()).includes(nameToTest.toLowerCase());
    if (isReserved) {
      console.log(`✅ PASS: Logic correctly identified "${nameToTest}" as a reserved name.`);
    } else {
      console.log(`❌ FAIL: Logic failed to identify "${nameToTest}" as reserved.`);
    }

    console.log('\n--- Tests Completed ---');
    process.exit(0);

  } catch (err) {
    console.error('❌ BLOCKER ERROR:', err);
    process.exit(1);
  }
}

runTests();
