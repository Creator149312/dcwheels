import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/user.js";

dotenv.config();

async function getIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const emails = [
      'shadowroguex@example.ie',
      'pixelsamurai77@example.jp',
      'cactusridermx@example.mx',
      'falcondune99@example.ae',
      'mysticlotusin@example.in',
      'ironbritknight@example.uk',
      'libertyeagleusa@example.us'
    ];
    const users = await User.find({ email: { $in: emails } }, 'email _id name handle');
    console.log(JSON.stringify(users, null, 2));
    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
  }
}

getIds();
