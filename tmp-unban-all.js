require('dotenv').config({ path: './.env' });
const { connectMongoDB } = require('./lib/mongodb');

(async () => {
  await connectMongoDB();
  const Post = (await import('./models/post.js')).default;
  const User = (await import('./models/user.js')).default;

  // Comment/Report model files import `mongoose, { Schema, models } from "mongoose"`,
  // which breaks when imported directly from a CommonJS script under Node 24.
  // We instead register minimal models on the same connection using the existing
  // collection names so the cleanup can target them.
  const mongoose = (await import('mongoose')).default;
  const { Schema } = mongoose;
  const Comment = mongoose.models.Comment || mongoose.model('Comment', new Schema({}, { strict: false }), 'comments');
  const Report = mongoose.models.Report || mongoose.model('Report', new Schema({}, { strict: false }), 'reports');

  const userRes = await User.updateMany(
    { shadowBanned: true },
    { $set: { shadowBanned: false } }
  );
  const postRes = await Post.updateMany(
    { shadowBanned: true },
    { $set: { shadowBanned: false } }
  );
  const commentRes = await Comment.updateMany(
    { shadowBanned: true },
    { $set: { shadowBanned: false } }
  );

  console.log('Unbanned users:', userRes.modifiedCount);
  console.log('Unbanned posts:', postRes.modifiedCount);
  console.log('Unbanned comments:', commentRes.modifiedCount);

  const reportRes = await Report.updateMany(
    {},
    { $set: { status: 'dismissed' } }
  );
  console.log('Dismissed reports:', reportRes.modifiedCount);

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
