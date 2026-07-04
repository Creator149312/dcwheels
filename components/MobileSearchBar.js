import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Search, ArrowLeft, X, Clock, History, Zap } from 'lucide-react';

export default function MobileSearchBar() {
  const router = useRouter();

  const [isMobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef(null);

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
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/wheel/suggest?query=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } catch (err) {
        if (err.name !== 'AbortError') setSuggestions([]);
      }
    }, 300);
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const handleSuggestionClick = (s) => {
    setSuggestions([]);
    setMobileSearchOpen(false);
    setIsFocused(false);
    router.push(`/uwheels/${s._id}`);
  };

  return (
    <div className='w-full flex justify-end items-center' ref={searchRef}>
      <div className='hidden sm:flex relative w-full max-w-md'>
        <div className={`flex w-full items-center transition-all duration-200 rounded-xl border-2 ${isFocused ? 'border-primary bg-background shadow-lg' : 'border-transparent bg-muted/50'}`}>
          <div className='pl-3 flex items-center justify-center'>
            <Search className={isFocused ? 'text-primary' : 'text-muted-foreground'} size={18} />
          </div>
          <input
            type='text'
            value={query}
            onFocus={() => setIsFocused(true)}
            onChange={handleChange}
            onKeyDown={handleKeyPress}
            placeholder='Search wheels, movies, anime...'
            className='w-full bg-transparent pl-2 pr-3 py-2 text-sm focus:outline-none text-foreground'
          />
        </div>

        {(suggestions.length > 0 || (isFocused && !query && recentSearches.length > 0)) && (
          <div className='absolute top-[calc(100%+8px)] left-0 w-full bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200'>
            <div className='max-h-[400px] overflow-y-auto p-1'>
              {query && suggestions.length > 0 ? (
                suggestions.map((s) => (
                  <button key={s._id} onClick={() => handleSuggestionClick(s)} className='w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors rounded-xl mb-1 last:mb-0'>
                    <div className='w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0'><Zap size={14} className='text-primary' /></div>
                    <div className='flex flex-col min-w-0'>
                      <span className='text-sm font-bold truncate text-foreground'>{s.title}</span>
                      <span className='text-[10px] text-muted-foreground uppercase tracking-tight'>Spin Wheel</span>
                    </div>
                  </button>
                ))
              ) : !query && isFocused && recentSearches.length > 0 && (
                <>
                  <div className='px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2'><History size={12} />Recent Searches</div>
                  {recentSearches.map((s) => (
                    <button key={s} onClick={() => handleSubmit(s)} className='w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors rounded-xl mb-1 last:mb-0 group'>
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
                  <input autoFocus type='text' value={query} onChange={handleChange} onKeyDown={handleKeyPress} placeholder='Search...' className='w-full bg-transparent py-1 text-base focus:outline-none text-foreground' />
                  {query && <X onClick={() => setQuery('')} className='text-muted-foreground ml-2' size={18} aria-label='Clear' />}
                </div>
              </div>
              {(suggestions.length > 0 || (!query && recentSearches.length > 0)) && (
                <div className='fixed left-0 right-0 mx-4 bg-card border border-border rounded-3xl shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 pointer-events-auto p-1' style={{ top: 'calc(4.75rem + env(safe-area-inset-top))' }}>
                  {query && suggestions.length > 0 ? (
                    suggestions.map((s) => (
                      <button key={s._id} onClick={() => handleSuggestionClick(s)} className='w-full flex items-center gap-4 px-4 py-4 rounded-2xl active:bg-muted transition-colors mb-1 last:mb-0'>
                        <div className='w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0'><Zap size={18} className='text-primary' /></div>
                        <div className='flex flex-col text-left min-w-0'>
                          <span className='text-sm font-bold text-foreground truncate'>{s.title}</span><span className='text-[10px] text-muted-foreground uppercase tracking-tight'>Spin Wheel</span>
                        </div>
                      </button>
                    ))
                  ) : !query && recentSearches.length > 0 && (
                    <>
                      <div className='px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2'><History size={12} />Recent Searches</div>
                      {recentSearches.map((s) => (
                        <button key={s} onClick={() => handleSubmit(s)} className='w-full flex items-center gap-4 px-5 py-4 rounded-2xl active:bg-muted transition-colors mb-1 last:mb-0'>
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
