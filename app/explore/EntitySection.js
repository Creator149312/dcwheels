import { fetchExploreEntities } from "@lib/explore";
import ExploreEntityRail from "./ExploreEntityRail";

export default async function EntitySection() {
  const { games, anime, movies } = await fetchExploreEntities();

  return (
    <div className="mt-4 pt-2">
      <div className="mb-4">
        <h2 className="text-base md:text-xl font-black text-foreground">
          Trending in pop culture
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
          Hot games, anime and movies — perfect material for your next decision wheel
        </p>
      </div>

      <ExploreEntityRail
        title="Trending Games"
        emoji="🎮"
        items={games}
        viewAllHref="/game"
        accentColor="text-emerald-500"
      />
      <ExploreEntityRail
        title="Trending Anime"
        emoji="🌸"
        items={anime}
        viewAllHref="/anime"
        accentColor="text-pink-500"
      />
      <ExploreEntityRail
        title="Trending Movies"
        emoji="🎬"
        items={movies}
        viewAllHref="/movie"
        accentColor="text-amber-500"
      />
    </div>
  );
}
