require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    email: String,
    emailVerified: Date
  }));
  
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
