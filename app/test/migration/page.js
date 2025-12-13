// app/migration/page.js
//this is for list migration from Old List Types to new UnifiedList type
import List from "@models/list"; // old word list
import SaveList from "@models/savelist"; // old entity list
import UnifiedList from "@models/unifiedlist"; // new unified list
import { connectMongoDB } from "@lib/mongodb";
import User from "@models/user";

export const dynamic = "force-dynamic";

export default async function MigrationPage() {
  await connectMongoDB();

  let migratedWordCount = 0;
  let migratedEntityCount = 0;

  const failedWordLists = [];
  const failedEntityLists = [];
  const skippedWordItemsLog = [];

  // try {
  //   // ✅ 1. Migrate Word Lists
  //   const wordLists = await List.find({}).lean();

  //   for (const wl of wordLists) {
  //     try {
  //       const user = await User.findOne({ email: wl.createdBy }).lean();

  //       if (!user) {
  //         console.warn(`⚠️ No user found for email: ${wl.createdBy}. Skipping list: ${wl.title}`);
  //         continue;
  //       }

  //       // ✅ Check if already migrated
  //       const exists = await UnifiedList.findOne({
  //         userId: user._id,
  //         name: wl.title,
  //       }).lean();

  //       if (exists) {
  //         console.log(`⏭️ Skipping existing word list: ${wl.title}`);
  //         continue;
  //       }

  //       // ✅ Filter + log skipped items
  //       const validItems = [];
  //       const skippedItems = [];

  //       for (const w of wl.words || []) {
  //         if (!w?.word || w.word.trim() === "") {
  //           skippedItems.push(w);
  //           continue;
  //         }

  //         validItems.push({
  //           type: "word",
  //           word: w.word,
  //           wordData: w.wordData || "",
  //         });
  //       }

  //       if (skippedItems.length > 0) {
  //         console.warn(`⚠️ Skipped ${skippedItems.length} empty items in list: ${wl.title}`);
  //         skippedWordItemsLog.push({
  //           listId: wl._id,
  //           title: wl.title,
  //           skippedCount: skippedItems.length,
  //           skippedItems,
  //         });
  //       }

  //       // ✅ Create unified list
  //       await UnifiedList.create({
  //         userId: user._id,
  //         name: wl.title,
  //         description: wl.description || "",
  //         items: validItems,
  //         createdAt: wl.createdAt,
  //         updatedAt: wl.updatedAt,
  //       });

  //       migratedWordCount++;
  //     } catch (err) {
  //       console.error(`❌ Error migrating WORD list: ${wl.title} (ID: ${wl._id})`);
  //       console.error(err);

  //       failedWordLists.push({
  //         id: wl._id,
  //         title: wl.title,
  //         createdBy: wl.createdBy,
  //         error: err.message,
  //       });
  //     }
  //   }

  //   // ✅ 2. Migrate Entity Lists
  //   const entityLists = await SaveList.find({}).lean();

  //   for (const el of entityLists) {
  //     try {
  //       const exists = await UnifiedList.findOne({
  //         userId: el.userId,
  //         name: el.name,
  //       }).lean();

  //       if (exists) {
  //         console.log(`⏭️ Skipping existing entity list: ${el.name}`);
  //         continue;
  //       }

  //       await UnifiedList.create({
  //         userId: el.userId,
  //         name: el.name,
  //         description: el.description || "",
  //         items: (el.items || []).map((i) => ({
  //           type: "entity",
  //           entityType: i.entityType,
  //           entityId: i.entityId,
  //           name: i.name,
  //           slug: i.slug,
  //           image: i.image,
  //           addedAt: i.addedAt,
  //         })),
  //         createdAt: el.createdAt,
  //         updatedAt: el.updatedAt,
  //       });

  //       migratedEntityCount++;
  //     } catch (err) {
  //       console.error(`❌ Error migrating ENTITY list: ${el.name} (ID: ${el._id})`);
  //       console.error(err);

  //       failedEntityLists.push({
  //         id: el._id,
  //         name: el.name,
  //         userId: el.userId,
  //         error: err.message,
  //       });
  //     }
  //   }

  //   return (
  //     <div style={{ padding: 20 }}>
  //       <h1>✅ Migration Completed</h1>

  //       <p>Word Lists Migrated: {migratedWordCount}</p>
  //       <p>Entity Lists Migrated: {migratedEntityCount}</p>

  //       <h2>⚠️ Skipped Word Items</h2>
  //       <pre>{JSON.stringify(skippedWordItemsLog, null, 2)}</pre>

  //       <h2>⚠️ Failed Word Lists</h2>
  //       <pre>{JSON.stringify(failedWordLists, null, 2)}</pre>

  //       <h2>⚠️ Failed Entity Lists</h2>
  //       <pre>{JSON.stringify(failedEntityLists, null, 2)}</pre>

  //       <p>You can safely run this migration again — duplicates will be skipped.</p>
  //     </div>
  //   );
  // } catch (err) {
  //   return (
  //     <div style={{ padding: 20 }}>
  //       <h1>❌ Migration Failed</h1>
  //       <pre>{err.message}</pre>
  //     </div>
  //   );
  // }
}
