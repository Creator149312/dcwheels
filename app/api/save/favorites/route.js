import { connectMongoDB } from "@lib/mongodb";
import SaveList from "@models/savelist";

export async function ensureFavorites(userId) {
  await connectMongoDB();
  let favorites = await SaveList.findOne({ userId, name: "Favorites" });
  if (!favorites) {
    favorites = await SaveList.create({
      userId,
      name: "Favorites",
      description: "Your default favorites list"
    });
  }
  return favorites;
}
