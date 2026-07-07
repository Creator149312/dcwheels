import mongoose from 'mongoose';
import User from './models/user.js';

const usersToVerify = [
  'shadowroguex@example.ie',
  'pixelsamurai77@example.jp',
  'cactusridermx@example.mx',
  'falcondune99@example.ae',
  'mysticlotusin@example.in',
  'ironbritknight@example.uk',
  'libertyeagleusa@example.us'
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spinwheel');
    console.log('✓ Connected to MongoDB\n');

    for (const email of usersToVerify) {
      const user = await User.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        console.log(`❌ ${email} - NOT FOUND`);
        continue;
      }

      // Set emailVerified to current date if not already set
      if (!user.emailVerified) {
        user.emailVerified = new Date();
        await user.save();
        console.log(`✓ ${email} - VERIFIED (updated)`);
      } else {
        console.log(`✓ ${email} - ALREADY VERIFIED`);
      }
    }

    console.log('\n✓ All users verified!');
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
})();
