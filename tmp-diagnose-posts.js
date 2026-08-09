require('dotenv').config({ path: './.env' });
const { connectMongoDB } = require('./lib/mongodb');

(async () => {
  await connectMongoDB();
  const Post = (await import('./models/post.js')).default;
  const User = (await import('./models/user.js')).default;
  const usernames = process.argv.slice(2).length ? process.argv.slice(2) : ['creators93', 'falcondune99'];
  const users = await User.find({ username: { $in: usernames } }).select('name email username').lean();
  for (const username of usernames) {
    const u = users.find(x => x.username === username);
    if (!u) { console.log('---', username, 'NOT FOUND ---'); continue; }
    const uid = String(u._id);
    console.log('---', u.username, uid, '---');
    const countAll = await Post.countDocuments({ userId: uid });
    const countObj = await Post.countDocuments({ userId: u._id });
    const countEither = await Post.countDocuments({ userId: { $in: [uid, u._id] } });
    const countPublic = await Post.countDocuments({ userId: { $in: [uid, u._id] }, isPublic: true });
    const countPrivate = await Post.countDocuments({ userId: { $in: [uid, u._id] }, isPublic: false });
    const countDeleted = await Post.countDocuments({ userId: { $in: [uid, u._id] }, isDeleted: true });
    const countShadow = await Post.countDocuments({ userId: { $in: [uid, u._id] }, shadowBanned: true });
    const feedPublicMatch = { userId: u._id, isDeleted: false, isPublic: true, shadowBanned: false };
    const feedOwnerMatch = { userId: u._id, isDeleted: false };
    const countFeedPublic = await Post.countDocuments(feedPublicMatch);
    const countFeedOwner = await Post.countDocuments(feedOwnerMatch);
    const sample = await Post.find({ userId: { $in: [uid, u._id] } }).select('content createdAt userId isPublic').sort({ createdAt: -1 }).limit(2).lean();
    console.log(JSON.stringify({ countAll, countObj, countEither, countPublic, countPrivate, countDeleted, countShadow, countFeedPublic, countFeedOwner, sample: sample.map(p => ({ text: p.content.slice(0, 40), createdAt: p.createdAt, isPublic: p.isPublic, userIdType: typeof p.userId })) }, null, 2));
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
