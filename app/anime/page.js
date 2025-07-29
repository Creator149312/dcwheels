// app/anime/page.js
import React from 'react';
import Link from 'next/link';
import { AniList, MediaType } from '@spkrbox/anilist';

// Helper to fetch anime by sort type
async function fetchAnime(sortKey) {
  const client = new AniList();
  const response = await client.media.search({
    type: MediaType.ANIME,
    sort: [sortKey],
    perPage: 10,
  });
  return response.media;
}

export default async function AnimeListPage() {
  // Fetch each section
  const [trending, topRated, mostPopular] = await Promise.all([
    fetchAnime('TRENDING_DESC'),
    fetchAnime('SCORE_DESC'),
    fetchAnime('POPULARITY_DESC'),
  ]);

  const renderSection = (title, animeList) => (
    <div className="mb-12">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {animeList.map((anime) => (
          <Link
            key={anime.id}
            href={`/anime/${anime.title.romaji.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200">
              <img
                src={anime.coverImage?.large || '/placeholder.jpg'}
                alt={anime.title.english || anime.title.romaji}
                className="w-full h-64 object-cover"
              />
              <div className="p-2">
                <h3 className="text-sm font-semibold truncate text-gray-900 dark:text-white">
                  {anime.title.english || anime.title.romaji}
                </h3>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-white dark:bg-gray-900 text-black dark:text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Discover Anime</h1>

      {renderSection('🔥 Trending Now', trending)}
      {renderSection('⭐ Top Rated', topRated)}
      {renderSection('🏆 Most Popular', mostPopular)}
    </div>
  );
}
