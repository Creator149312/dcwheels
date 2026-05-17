'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowLeft, X } from 'lucide-react';
import { Zap } from 'lucide-react';


export default function MobileSearchBar() {
  const router = useRouter();

  const [isMobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Native 300ms debounce on `query` → fetch suggestions. Replaces the
  // single-use `lodash.debounce` dep — saves a module without changing
  // behaviour. Cleanup cancels the pending timeout on every keystroke and
  // on unmount, and the AbortController kills any in-flight request that
  // would otherwise resolve into stale state.
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/wheel/suggest?query=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
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

  const handleChange = (e) => {
    setQuery(e.target.value);
  };

  const handleSubmit = () => {
    const cleaned = query.trim().replace(/\?/g, '_').toLowerCase();
    if (cleaned) {
      // Client-side nav keeps the app shell + AdSense slots mounted across
      // the search transition (vs window.location.href which forces a full
      // page reload + re-fetch of all globals).
      setSuggestions([]);
      setMobileSearchOpen(false);
      router.push(`/search/${encodeURIComponent(cleaned)}`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const handleSuggestionClick = (s) => {
    setSuggestions([]);
    setMobileSearchOpen(false);
    // Directly go to the specific wheel page using its ID
    router.push(`/uwheels/${s._id}`);
  };

  return (
    <div className="w-full flex justify-end items-center" ref={searchRef}>
      {/* --- DESKTOP VIEW --- */}
      <div className="hidden sm:flex relative w-full max-w-md">
        <div className={`flex w-full items-center transition-colors duration-200 rounded-xl border ${
          isFocused ? "border-primary bg-background shadow-sm" : "border-border bg-muted/50"}
        }`}>
          <div className="pl-3 flex items-center justify-center">
            <Search className={isFocused ? "text-blue-500" : "text-gray-400"} size={18} />
          </div>
          <input
            type="text"
            value={query}
            onFocus={() => setIsFocused(true)}
            onChange={handleChange}
            onKeyDown={handleKeyPress}
            placeholder={"Search wheels, movies, anime..."}
            className="w-full bg-transparent pl-2 pr-3 py-2 text-sm focus:outline-none text-foreground"
          />
        </div>

        {/* Desktop Suggestions */}
        {suggestions.length > 0 && (
          <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="max-h-[300px] overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s._id}
                  onClick={() => handleSuggestionClick(s)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors border-b last:border-0 border-border"
                >
                  <Zap size={14} className="text-blue-500 flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold truncate text-foreground">{s.title}</span>
                    {/* <span className="text-[10px] text-gray-500">Quick view</span> */}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- MOBILE VIEW --- */}
      <div className="sm:hidden">
        {!isMobileSearchOpen ? (
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="p-2 text-muted-foreground hover:bg-muted rounded-lg"
            aria-label={"Search wheels..."}
          >
            <Search size={24} />
          </button>
        ) : (
          <div
            className="fixed top-0 left-0 right-0 z-[120] bg-card px-4 py-3 flex items-center shadow-md animate-in slide-in-from-top duration-200"
            style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
          >
            <button onClick={() => setMobileSearchOpen(false)} className="mr-2 text-gray-500" aria-label={"Back"}>
              <ArrowLeft size={22} />
            </button>
            <div className="flex-1 flex items-center bg-muted rounded-full px-3 py-1">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={handleChange}
                onKeyDown={handleKeyPress}
                placeholder={"Search wheels, movies, anime..."}
                className="w-full bg-transparent py-1 text-base focus:outline-none text-gray-900 dark:text-white"
              />
              {query && <X onClick={() => setQuery('')} className="text-gray-400 ml-2" aria-label={"Clear"} />}
            </div>
          </div>
        )}

        {/* Mobile Suggestions Dropdown */}
        {isMobileSearchOpen && suggestions.length > 0 && (
          <div
            className="fixed left-0 right-0 mx-4 bg-card border border-border rounded-2xl shadow-lg z-[120] overflow-hidden max-h-[60vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            style={{ top: "calc(4.25rem + env(safe-area-inset-top))" }}
          >
            {suggestions.map((s) => (
              <button
                key={s._id}
                onClick={() => handleSuggestionClick(s)}
                className="w-full flex items-center gap-4 px-5 py-4 border-b border-border active:bg-muted/70"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Zap size={16} className="text-blue-500" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-foreground">{s.title}</span>
                  {/* <span className="text-[11px] text-gray-500">Open wheel</span> */}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}