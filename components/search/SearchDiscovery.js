'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  Search, 
  TrendingUp, 
  Film, 
  Gamepad2, 
  User, 
  Zap, 
  History,
  X,
  Layout
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Search, color: 'text-primary' },
  { id: 'anime', label: 'Anime', icon: Sparkles, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { id: 'movie', label: 'Movies', icon: Film, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { id: 'game', label: 'Games', icon: Gamepad2, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { id: 'character', label: 'Characters', icon: User, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  { id: 'wheel', label: 'Wheels', icon: Zap, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
];

const TRENDING = [
  "Dragon Ball Z", "Elden Ring", "Batman", "One Piece", "Marvel", "Horror"
];

export default function SearchDiscovery() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('recent_searches');
    if (saved) setRecentSearches(JSON.parse(saved).slice(0, 5));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      saveSearch(query.trim());
      router.push(`/search/${encodeURIComponent(query.trim())}`);
    }
  };

  const saveSearch = (term) => {
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 10);
    setRecentSearches(updated.slice(0, 5));
    localStorage.setItem('recent_searches', JSON.stringify(updated));
  };

  const removeSearch = (term, e) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    localStorage.setItem('recent_searches', JSON.stringify(updated));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-16 space-y-12 animate-in fade-in duration-700">
      {/* Search Hero */}
      <div className="text-center space-y-6">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground">
          Explore the <span className="text-primary italic">Universe</span>
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto">
          Search for your favorite anime, movies, games, or find the perfect spin wheel for your next decision.
        </p>
        
        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
            <Search size={20} />
          </div>
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anything..."
            className="w-full h-14 md:h-16 pl-14 pr-6 rounded-2xl border-2 border-border bg-card text-lg focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none shadow-sm"
          />
          <button 
            type="submit"
            className="absolute right-3 inset-y-3 bg-primary text-primary-foreground px-6 rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all hidden md:block"
          >
            Search
          </button>
        </form>
      </div>

      {/* Quick History/Trending */}
      <div className="grid md:grid-cols-2 gap-12 pt-4">
        {recentSearches.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <History size={14} /> Recent Searches
            </h2>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((s) => (
                <div key={s} className="group flex items-center bg-muted/50 hover:bg-muted border border-border/50 rounded-full pl-4 pr-2 py-1.5 transition-colors cursor-pointer" onClick={() => router.push(`/search/${encodeURIComponent(s)}`)}>
                  <span className="text-sm font-medium">{s}</span>
                  <button onClick={(e) => removeSearch(s, e)} className="p-1 ml-1 rounded-full hover:bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <TrendingUp size={14} /> Trending Now
          </h2>
          <div className="flex flex-wrap gap-2">
            {TRENDING.map((s) => (
              <Link key={s} href={`/search/${encodeURIComponent(s)}`} className="text-sm font-semibold px-4 py-2 bg-background border border-border rounded-xl hover:border-primary hover:text-primary transition-all">
                {s}
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Explore Grid */}
      <section className="space-y-6">
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground text-center">Browse by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.slice(1).map((cat) => (
            <Link 
              key={cat.id} 
              href={`/search/trending?type=${cat.id}`}
              className={`flex flex-col items-center justify-center p-6 rounded-3xl border border-border bg-card hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative`}
            >
              <div className={`p-3 rounded-2xl ${cat.bgColor} ${cat.color} mb-3 group-hover:scale-110 transition-transform`}>
                <cat.icon size={24} />
              </div>
              <span className="font-bold text-sm">{cat.label}</span>
              <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
