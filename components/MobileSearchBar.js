'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import debounce from 'lodash.debounce';
import { HiSearch, HiArrowLeft, HiX } from 'react-icons/hi';
import { Zap } from 'lucide-react';

export default function MobileSearchBar() {
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

  const fetchSuggestions = async (q) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/wheel/suggest?query=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
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
    setSuggestions([]);
    setMobileSearchOpen(false);
    // Directly go to the specific wheel page using its ID
    window.location.href = `/uwheels/${s._id}`;
  };

  return (
    <div className="w-full flex justify-end items-center" ref={searchRef}>
      {/* --- DESKTOP VIEW --- */}
      <div className="hidden sm:flex relative w-full max-w-md">
        <div className={`flex w-full items-center transition-all duration-200 rounded-xl border ${
          isFocused ? "border-blue-500 bg-white dark:bg-gray-900 shadow-sm" : "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"
        }`}>
          <div className="pl-3 flex items-center justify-center">
            <HiSearch className={isFocused ? "text-blue-500" : "text-gray-400"} size={18} />
          </div>
          <input
            type="text"
            value={query}
            onFocus={() => setIsFocused(true)}
            onChange={handleChange}
            onKeyDown={handleKeyPress}
            placeholder="Search wheels..."
            className="w-full bg-transparent pl-2 pr-3 py-2 text-sm focus:outline-none text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Desktop Suggestions */}
        {suggestions.length > 0 && (
          <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="max-h-[300px] overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s._id}
                  onClick={() => handleSuggestionClick(s)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b last:border-0 border-gray-100 dark:border-gray-800"
                >
                  <Zap size={14} className="text-blue-500 flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold truncate text-gray-800 dark:text-gray-100">{s.title}</span>
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
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <HiSearch size={24} />
          </button>
        ) : (
          <div
            className="fixed top-0 left-0 right-0 z-[120] bg-white dark:bg-gray-900 px-4 py-3 flex items-center shadow-lg animate-in slide-in-from-top duration-200"
            style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
          >
            <button onClick={() => setMobileSearchOpen(false)} className="mr-2 text-gray-500">
              <HiArrowLeft size={22} />
            </button>
            <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={handleChange}
                onKeyDown={handleKeyPress}
                placeholder="Search wheels..."
                className="w-full bg-transparent py-1 text-base focus:outline-none text-gray-900 dark:text-white"
              />
              {query && <HiX onClick={() => setQuery('')} className="text-gray-400 ml-2" />}
            </div>
          </div>
        )}

        {/* Mobile Suggestions Dropdown */}
        {isMobileSearchOpen && suggestions.length > 0 && (
          <div
            className="fixed left-0 right-0 mx-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl z-[120] overflow-hidden max-h-[60vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            style={{ top: "calc(4.25rem + env(safe-area-inset-top))" }}
          >
            {suggestions.map((s) => (
              <button
                key={s._id}
                onClick={() => handleSuggestionClick(s)}
                className="w-full flex items-center gap-4 px-5 py-4 border-b border-gray-50 dark:border-gray-800 active:bg-blue-50 dark:active:bg-blue-900/20"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Zap size={16} className="text-blue-500" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.title}</span>
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

// 'use client';
// import { useState, useCallback } from 'react';
// import debounce from 'lodash.debounce';
// import { HiSearch, HiArrowLeft } from 'react-icons/hi';

// export default function MobileSearchBar() {
//   const [isMobileSearchOpen, setMobileSearchOpen] = useState(false);
//   const [query, setQuery] = useState('');
//   const [suggestions, setSuggestions] = useState([]);

//   const fetchSuggestions = async (q) => {
//     if (q.length < 3) {
//       setSuggestions([]);
//       return;
//     }
//     try {
//       const res = await fetch(`/api/wheel/suggest?query=${encodeURIComponent(q)}`);
//       if (!res.ok) return;
//       const data = await res.json();
//       setSuggestions(data.suggestions || []);
//     } catch (err) {
//       console.error('Suggestion fetch failed:', err);
//       setSuggestions([]);
//     }
//   };

//   const debouncedFetch = useCallback(debounce(fetchSuggestions, 300), []);

//   const handleChange = (e) => {
//     const value = e.target.value;
//     setQuery(value);
//     debouncedFetch(value);
//   };

//   const handleSubmit = () => {
//     const cleaned = query.trim().replace(/\?/g, '_').toLowerCase();
//     if (cleaned) {
//       window.location.href = `/search/${encodeURIComponent(cleaned)}`;
//     }
//   };

//   const handleKeyPress = (e) => {
//     if (e.key === 'Enter') handleSubmit();
//   };

//   const handleSuggestionClick = (s) => {
//     setQuery(s.title);
//     setSuggestions([]);
//     window.location.href = `/search/${encodeURIComponent(s.title)}`;
//   };

//   return (
//     <>
//       {/* Desktop Search Bar */}
//       <div className="hidden sm:flex w-full max-w-xl items-center bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1 relative">
//         <input
//           type="text"
//           value={query}
//           onChange={handleChange}
//           onKeyDown={handleKeyPress}
//           placeholder="Search..."
//           className="w-full bg-transparent pl-2 pr-2 py-1 text-sm focus:outline-none text-gray-900 dark:text-gray-100"
//         />
//         <button
//           onClick={handleSubmit}
//           className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
//         >
//           <HiSearch size={20} className="text-gray-600 dark:text-gray-300" />
//         </button>

//         {suggestions.length > 0 && (
//           <ul className="absolute top-full left-0 w-full bg-white dark:bg-gray-800 border rounded-md shadow-md mt-1 z-50">
//             {suggestions.map((s, i) => (
//               <li
//                 key={i}
//                 onClick={() => handleSuggestionClick(s)}
//                 className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
//               >
//                 {s.title}
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>

//       {/* Mobile Search Icon & Overlay */}
//       <div className="sm:hidden flex items-center">
//         {!isMobileSearchOpen ? (
//           <button
//             onClick={() => setMobileSearchOpen(true)}
//             className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
//           >
//             <HiSearch size={24} className="text-gray-700 dark:text-gray-300" />
//           </button>
//         ) : (
//           <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 px-4 py-2 flex items-center shadow-md">
//             <button
//               onClick={() => setMobileSearchOpen(false)}
//               className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
//             >
//               <HiArrowLeft size={24} className="text-gray-700 dark:text-gray-300" />
//             </button>
//             <input
//               type="text"
//               autoFocus
//               value={query}
//               onChange={handleChange}
//               onKeyDown={handleKeyPress}
//               placeholder="Search..."
//               className="w-full bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
//             />
//             <button
//               onClick={handleSubmit}
//               className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
//             >
//               <HiSearch size={24} className="text-gray-600 dark:text-gray-300" />
//             </button>
//           </div>
//         )}
//       </div>

//       {/* Suggestions Dropdown for Mobile */}
//       {isMobileSearchOpen && suggestions.length > 0 && (
//         <ul className="absolute top-14 left-0 w-full bg-white dark:bg-gray-800 border rounded-md shadow-md mt-1 z-50 sm:hidden">
//           {suggestions.map((s, i) => (
//             <li
//               key={i}
//               onClick={() => handleSuggestionClick(s)}
//               className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
//             >
//               {s.title}
//             </li>
//           ))}
//         </ul>
//       )}
//     </>
//   );
// }
