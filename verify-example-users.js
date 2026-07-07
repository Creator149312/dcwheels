import mongoose from 'mongoose';
import User from './models/user.js';

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spinwheel');
    console.log('✓ Connected to MongoDB');

    // List of example emails that should be verified
    const exampleEmails = [
      'shadowroguex@example.ie',
      'mysticlotusin@example.in',
      'ironbritknight@example.uk',
      'libertyeagleusa@example.us'
    ];

    for (const email of exampleEmails) {
      const result = await User.findOneAndUpdate(
        { email },
        { emailVerified: new Date() },
        { new: true }
      );
      if (result) {
        console.log(`✓ Verified: ${email} (emailVerified: ${result.emailVerified})`);
      } else {
        console.log(`❌ User not found: ${email}`);
      }
    }

    console.log('\n--- Checking user details after verification ---');
    for (const email of exampleEmails) {
      const user = await User.findOne({ email }).select('email emailVerified password').lean();
      if (user) {
        console.log(`\n${email}:`);
        console.log(`  emailVerified: ${user.emailVerified}`);
        console.log(`  hasPassword: ${!!user.password}`);
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
})();
