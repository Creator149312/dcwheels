require('dotenv').config();
const { connectMongoDB } = require('../lib/mongodb');
const User = require('../models/user');

async function check() {
  await connectMongoDB();
  const user = await User.findOne({ email: "dharamveer@email.com" });
  if (user) {
    console.log('User found:', user.email);
    console.log('emailVerified:', user.emailVerified);
    if (!user.emailVerified) {
        console.log('Verifying user...');
        user.emailVerified = new Date();
        await user.save();
        console.log('User verified!');
    }
  } else {
    console.log('User not found');
  }
  process.exit(0);
}

check();
