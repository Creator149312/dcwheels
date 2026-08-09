import { connectMongoDB } from "./lib/mongodb.js";
import mongoose from "mongoose";

async function run() {
    await connectMongoDB();
    
    // Define minimal schemas inside the script to avoid import issues
    const Tag = mongoose.models.Tag || mongoose.model("Tag", new mongoose.Schema({
        slug: String,
        isPublic: { type: Boolean, default: true }
    }, { collection: 'tags' }));

    const Wheel = mongoose.models.Wheel || mongoose.model("Wheel", new mongoose.Schema({
        tags: [String],
        isPublic: Boolean,
        isDeleted: Boolean
    }, { collection: 'wheels' }));

    const Post = mongoose.models.Post || mongoose.model("Post", new mongoose.Schema({
        tags: [String],
        isPublic: Boolean,
        isDeleted: Boolean,
        shadowBanned: Boolean
    }, { collection: 'posts' }));

    const tagsToCheck = ["animefeels", "epicbattles", "friendshipgoals"];
    
    console.log("--- START DB CHECK ---");
    for (const tag of tagsToCheck) {
        const tagDoc = await Tag.findOne({ slug: tag.toLowerCase() }).lean();
        const wc = await Wheel.countDocuments({ tags: tag.toLowerCase(), isPublic: true, isDeleted: false });
        const pc = await Post.countDocuments({ tags: tag.toLowerCase(), isPublic: true, isDeleted: false, shadowBanned: { $ne: true } });
        
        console.log(`Tag: ${tag}`);
        console.log(`  Tag Document: ${tagDoc ? 'EXISTS' : 'MISSING'}`);
        if(tagDoc) console.log(`  isPublic: ${tagDoc.isPublic}`);
        console.log(`  Wheels in DB: ${wc}`);
        console.log(`  Posts in DB: ${pc}`);
        console.log(`  Total Content: ${wc + pc}`);
        console.log("---");
    }
    console.log("--- END DB CHECK ---");
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
