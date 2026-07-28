import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import User from '../models/user.js';
import Post from '../models/post.js';

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);

    const email = 'shadowroguex@example.ie';
    const password = 'PhantomBlade!21';
    
    let user = await User.findOne({ email });
    
    if (!user) {
      console.log('User not found. Creating user shadowroguex...');
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await User.create({
        email,
        name: 'ShadowRogueX',
        username: 'shadowroguex',
        password: hashedPassword,
        authMethod: 'emailPassword'
      });
      console.log('User created.');
    } else {
      console.log('User shadowroguex already exists.');
    }

    // Controversial Chainsaw Man Post
    const controversialContent = 
      "Unpopular opinion: Makima is actually the tragic hero of Chainsaw Man. " +
      "Everything she did was to erase concepts like hunger, death, and war from existence " +
      "to create a perfect world for humanity. Denji is just a selfish obstacle " +
      "who chose his own comfort over the salvation of the human race. #ChainsawMan #MakimaDidNothingWrong";

    // Using the official Post model
    const post = new Post({
      userId: user._id,
      authorName: user.name,
      authorHandle: user.username,
      content: controversialContent,
      tags: ['Chainsaw Man', 'Anime', 'HotTake'],
      isPublic: true,
      contentRef: {
        type: 'anime',
        externalId: '127230',
        slug: '127230-chainsaw-man',
        title: 'Chainsaw Man'
      }
    });

    await post.save();

    console.log('Successfully seeded controversial post using official models!');
    console.log('Post ID:', post._id);
    
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
