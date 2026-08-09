import mongoose from 'mongoose';
import 'dotenv/config';

async function migrateTags() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const collection = mongoose.connection.db.collection('tags');
        const cursor = collection.find({ slug: null, name: { $ne: null } });
        
        let count = 0;
        let failCount = 0;

        while (await cursor.hasNext()) {
            const tag = await cursor.next();
            const slug = tag.name.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '')
                .replace(/-+/g, '-');

            try {
                // Check if a tag with this slug already exists
                const existing = await collection.findOne({ slug });
                if (existing) {
                    console.log(`Tag with slug "${slug}" already exists. Merging...`);
                    // Optionally merge counts here if needed, but for now just update the legacy record to have a unique slug if needed or delete it
                    // Let's just give it a unique slug for now to avoid losing data
                    const uniqueSlug = `${slug}-${tag._id.toString().slice(-4)}`;
                    await collection.updateOne(
                        { _id: tag._id },
                        { 
                            $set: { 
                                slug: uniqueSlug, 
                                displayName: tag.name,
                                isMigrated: true 
                            } 
                        }
                    );
                } else {
                    await collection.updateOne(
                        { _id: tag._id },
                        { 
                            $set: { 
                                slug: slug, 
                                displayName: tag.name,
                                isMigrated: true 
                            } 
                        }
                    );
                }
                count++;
            } catch (err) {
                console.error(`Failed to update tag ${tag._id}:`, err.message);
                failCount++;
            }
        }

        console.log(`Migration complete. Migrated: ${count}, Failed: ${failCount}`);
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
}

migrateTags();
