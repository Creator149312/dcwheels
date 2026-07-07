import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  emailVerified: Date,
  name: String,
});

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spinwheel');
    console.log('✓ Connected to MongoDB');

    // Check which collections exist
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nAvailable collections:', collections.map(c => c.name));

    // Try to find the user
    const User = mongoose.models.User || mongoose.model('User', userSchema);
    const user = await User.findOne({ email: 'ironbritknight@example.uk' }).lean();

    if (!user) {
      console.log('\n❌ User NOT found with email: ironbritknight@example.uk');
      // Try to find any user to debug
      const anyUser = await User.findOne().lean();
      console.log('Sample user found:', anyUser ? anyUser.email : 'No users at all');
    } else {
      console.log('\n✓ User found:');
      console.log('  Email:', user.email);
      console.log('  Name:', user.name);
      console.log('  Email Verified:', user.emailVerified);
      console.log('  Has password:', !!user.password);
      console.log('  Password length:', user.password?.length);
      console.log('  Password preview:', user.password?.substring(0, 30) + '...');

      // Test password
      try {
        const passwordToTest = 'TowerGuard#47';
        const isMatch = await bcrypt.compare(passwordToTest, user.password);
        console.log(`\n  Password test (${passwordToTest}):`, isMatch ? '✓ MATCHES' : '❌ DOES NOT MATCH');
      } catch (e) {
        console.log('  Password comparison error:', e.message);
      }
    }

    // Also check auth route to understand how it validates
    console.log('\n--- Checking authentication implementation ---');
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
})();
