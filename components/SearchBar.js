import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Search, ArrowLeft, X, Clock, History, Zap, Sparkles, Film, Gamepad2, User } from 'lucide-react';
import { getWheelUrl } from "@utils/UrlHandler";

const TYPE_ICON = {
  wheel: Zap,
  anime: Sparkles,
  movie: Film,
  game: Gamepad2,
  character: User,
};

const TYPE_LABEL = {
  wheel: "Spin Wheel",
  anime: "Anime",
  movie: "Movie",
  game: "Game",
  character: "Character",
};

const TYPE_COLOR = {
  wheel: "text-amber-500 bg-amber-500/10",
  anime: "text-purple-500 bg-purple-500/10",
  movie: "text-blue-500 bg-blue-500/10",
  game: "text-green-500 bg-green-500/10",
  character: "text-orange-500 bg-orange-500/10",
};

export default function SearchBar() {
  const router = useRouter();

  const [isMobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) setRecentSearches(JSON.parse(saved).slice(0, 5));
  }, [isFocused, isMobileSearchOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        (searchRef.current && searchRef.current.contains(e.target)) ||
        (e.target.closest && e.target.closest('#mobile-search-portal'))
      ) {
        return;
      }
      setSuggestions([]);
      setIsFocused(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setHighlightIndex(-1);
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/wheel/suggest?query=${encodeURIComponent(query)}`, { 
          signal: controller.signal,
          headers: { 'cache-control': 'max-age=600' }
        });
        if (!res.ok) return;
        const data = await res.json();
        const items = data.suggestions || [];
        setSuggestions(items);
        // Don't auto-highlight first suggestion; user must press ArrowDown to select.
        setHighlightIndex(-1);
      } catch (err) {
        if (err.name !== 'AbortError') setSuggestions([]);
      }
    }, 250);
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  const saveSearch = (q) => {
    const saved = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    const updated = [q, ...saved.filter(item => item !== q)].slice(0, 10);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
  };

  const handleSubmit = (overrideQuery) => {
    const q = overrideQuery || query;
    const cleaned = q.trim().replace(/\?/g, '_').toLowerCase();
    if (cleaned) {
      saveSearch(q.trim());
      setSuggestions([]);
      setMobileSearchOpen(false);
      setIsFocused(false);
      router.push(`/search/${encodeURIComponent(cleaned)}`);
    }
  };

  const handleSuggestionClick = (s) => {
    setSuggestions([]);
    setMobileSearchOpen(false);
    setIsFocused(false);
    saveSearch(s.title);

    if (s.route) {
      router.push(s.route);
    } else {
      router.push(getWheelUrl({ _id: s.id || s._id, slug: s.slug }));
    }
  };

  const handleKeyDown = (e) => {
    const list = suggestions.length > 0 ? suggestions : recentSearches;

    if (e.key === 'ArrowDown') {
      if (list.length === 0) return;
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % list.length);
    } else if (e.key === 'ArrowUp') {
      if (list.length === 0) return;
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + list.length) % list.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && list.length > 0) {
        if (suggestions.length > 0) {
          handleSuggestionClick(suggestions[highlightIndex]);
        } else {
          handleSubmit(recentSearches[highlightIndex]);
        }
      } else {
        handleSubmit();
      }
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setIsFocused(false);
      setMobileSearchOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className='w-full flex justify-end items-center' ref={searchRef}>
      <div className='hidden sm:flex relative w-full max-w-md'>
        <div className={`flex w-full items-center transition-all duration-200 rounded-xl border-2 ${isFocused ? 'border-primary bg-background shadow-lg' : 'border-transparent bg-muted/50'}`}>
          <input
            ref={inputRef}
            type='text'
            value={query}
            onFocus={() => setIsFocused(true)}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder='Search wheels, movies, anime...'
            className='w-full bg-transparent pl-3 pr-2 py-2 text-sm focus:outline-none text-foreground'
          />
          <button
            onClick={() => handleSubmit()}
            className='pr-3 pl-2 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors'
            aria-label='Search'
          >
            <Search className={isFocused ? 'text-primary' : 'text-muted-foreground'} size={18} />
          </button>
        </div>

        {(suggestions.length > 0 || (isFocused && !query && recentSearches.length > 0)) && (
          <div className='absolute top-[calc(100%+8px)] left-0 w-full bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200'>
            <div className='max-h-[400px] overflow-y-auto p-1'>
              {query && suggestions.length > 0 ? (
                suggestions.map((s, i) => {
                  const SuggestionIcon = TYPE_ICON[s.type] || Zap;
                  const typeClass = TYPE_COLOR[s.type] || "text-primary bg-primary/10";
                  return (
                    <button key={s.id || s._id} onClick={() => handleSuggestionClick(s)} className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors rounded-xl mb-1 last:mb-0 group ${highlightIndex === i ? 'bg-muted' : 'hover:bg-muted'}`}>
                      <div className={`w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 ${typeClass}`}>
                        {s.cover ? (
                          <img src={s.cover} alt='' className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-300' />
                        ) : (
                          <SuggestionIcon size={16} />
                        )}
                      </div>
                      <div className='flex flex-col min-w-0'>
                        <span className='text-sm font-bold truncate text-foreground group-hover:text-primary transition-colors'>{s.title}</span>
                        <span className='text-[10px] text-muted-foreground uppercase tracking-tight font-semibold'>{TYPE_LABEL[s.type] || s.type}</span>
                      </div>
                    </button>
                  );
                })
              ) : !query && isFocused && recentSearches.length > 0 && (
                <>
                  <div className='px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2'><History size={12} />Recent Searches</div>
                  {recentSearches.map((s, i) => (
                    <button key={s} onClick={() => handleSubmit(s)} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors rounded-xl mb-1 last:mb-0 group ${highlightIndex === i ? 'bg-muted' : 'hover:bg-muted'}`}>
                      <Clock size={14} className='text-muted-foreground' /><span className='text-sm font-medium flex-1'>{s}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className='sm:hidden'>
        {!isMobileSearchOpen ? (
          <button onClick={() => setMobileSearchOpen(true)} className='p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors' aria-label='Search wheels...'><Search size={22} /></button>
        ) : typeof document !== 'undefined' ? (
          createPortal(
            <div id='mobile-search-portal' className='fixed inset-0 z-[9999] pointer-events-none'>
              <div className='fixed top-0 left-0 right-0 bg-card px-4 py-3 flex items-center shadow-lg animate-in slide-in-from-top duration-200 pointer-events-auto border-b border-border' style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
                <button onClick={() => setMobileSearchOpen(false)} className='mr-3 text-muted-foreground p-1' aria-label='Back'><ArrowLeft size={22} /></button>
                <div className='flex-1 flex items-center bg-muted/80 rounded-2xl px-4 py-1.5 focus-within:bg-muted transition-colors'>
                  <input autoFocus type='text' value={query} onChange={handleChange} onKeyDown={handleKeyDown} placeholder='Search...' className='w-full bg-transparent py-1 text-base focus:outline-none text-foreground' />
                  {query && <button onClick={() => { setQuery(''); setSuggestions([]); }} className='p-1 text-muted-foreground hover:text-foreground' aria-label='Clear'><X size={18} /></button>}
                </div>
              </div>
              {(suggestions.length > 0 || (!query && recentSearches.length > 0)) && (
                <div className='fixed left-0 right-0 mx-4 bg-card border border-border rounded-3xl shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 pointer-events-auto p-1' style={{ top: 'calc(4.75rem + env(safe-area-inset-top))' }}>
                  {query && suggestions.length > 0 ? (
                    suggestions.map((s, i) => {
                      const SuggestionIcon = TYPE_ICON[s.type] || Zap;
                      const typeClass = TYPE_COLOR[s.type] || "text-primary bg-primary/10";
                      return (
                        <button key={s.id || s._id} onClick={() => handleSuggestionClick(s)} className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-2xl transition-colors mb-1 last:mb-0 ${highlightIndex === i ? 'bg-muted' : 'active:bg-muted'}`}>
                          <div className={`w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 border border-border/10 ${typeClass}`}>
                            {s.cover ? (
                              <img src={s.cover} alt='' className='w-full h-full object-cover' />
                            ) : (
                              <SuggestionIcon size={20} />
                            )}
                          </div>
                          <div className='flex flex-col text-left min-w-0'>
                            <span className='text-base font-bold text-foreground truncate'>{s.title}</span>
                            <span className='text-xs text-muted-foreground uppercase tracking-tight font-semibold'>{TYPE_LABEL[s.type] || s.type}</span>
                          </div>
                        </button>
                      );
                    })
                  ) : !query && recentSearches.length > 0 && (
                    <>
                      <div className='px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2'><History size={12} />Recent Searches</div>
                      {recentSearches.map((s, i) => (
                        <button key={s} onClick={() => handleSubmit(s)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-colors mb-1 last:mb-0 ${highlightIndex === i ? 'bg-muted' : 'active:bg-muted'}`}>
                          <Clock size={16} className='text-muted-foreground flex-shrink-0' /><span className='text-sm font-medium text-foreground'>{s}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>,
            document.body
          )
        ) : null}
      </div>
    </div>
  );
}
