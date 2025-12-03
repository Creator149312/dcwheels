'use client';
import { useState, useCallback } from 'react';
import debounce from 'lodash.debounce';
import { HiSearch, HiArrowLeft } from 'react-icons/hi';

export default function MobileSearchBar() {
  const [isMobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const fetchSuggestions = async (q) => {
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/wheel/suggest?query=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error('Suggestion fetch failed:', err);
      setSuggestions([]);
    }
  };

  const debouncedFetch = useCallback(debounce(fetchSuggestions, 300), []);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedFetch(value);
  };

  const handleSubmit = () => {
    const cleaned = query.trim().replace(/\?/g, '_').toLowerCase();
    if (cleaned) {
      window.location.href = `/search/${encodeURIComponent(cleaned)}`;
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const handleSuggestionClick = (s) => {
    setQuery(s.title);
    setSuggestions([]);
    window.location.href = `/search/${encodeURIComponent(s.title)}`;
  };

  return (
    <>
      {/* Desktop Search Bar */}
      <div className="hidden sm:flex w-full max-w-xl items-center bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1 relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyPress}
          placeholder="Search..."
          className="w-full bg-transparent pl-2 pr-2 py-1 text-sm focus:outline-none text-gray-900 dark:text-gray-100"
        />
        <button
          onClick={handleSubmit}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          <HiSearch size={20} className="text-gray-600 dark:text-gray-300" />
        </button>

        {suggestions.length > 0 && (
          <ul className="absolute top-full left-0 w-full bg-white dark:bg-gray-800 border rounded-md shadow-md mt-1 z-50">
            {suggestions.map((s, i) => (
              <li
                key={i}
                onClick={() => handleSuggestionClick(s)}
                className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {s.title}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mobile Search Icon & Overlay */}
      <div className="sm:hidden flex items-center">
        {!isMobileSearchOpen ? (
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <HiSearch size={24} className="text-gray-700 dark:text-gray-300" />
          </button>
        ) : (
          <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 px-4 py-2 flex items-center shadow-md">
            <button
              onClick={() => setMobileSearchOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <HiArrowLeft size={24} className="text-gray-700 dark:text-gray-300" />
            </button>
            <input
              type="text"
              autoFocus
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyPress}
              placeholder="Search..."
              className="w-full bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleSubmit}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              <HiSearch size={24} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown for Mobile */}
      {isMobileSearchOpen && suggestions.length > 0 && (
        <ul className="absolute top-14 left-0 w-full bg-white dark:bg-gray-800 border rounded-md shadow-md mt-1 z-50 sm:hidden">
          {suggestions.map((s, i) => (
            <li
              key={i}
              onClick={() => handleSuggestionClick(s)}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {s.title}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
