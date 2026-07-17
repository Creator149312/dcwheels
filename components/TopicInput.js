"use client";

import { useEffect, useRef, useState } from "react";
import { X, Search, Hash } from "lucide-react";

/**
 * Multiple-Topic input with autocomplete.
 * Allows users to search for and select relatedTopic objects { type, id }.
 */

const DEBOUNCE_MS = 250;

export default function TopicInput({ value, onChange, placeholder = "Search for movies, anime, games..." }) {
  const selectedTopics = Array.isArray(value) ? value : [];

  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [highlight, setHighlight] = useState(-1);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = input.trim();
    
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const res = await fetch(`/api/topicpage/autocomplete?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal
        });
        if (!res.ok) throw new Error("Search failed");
        
        const json = await res.json();
        
        // Filter out already selected topics
        const filtered = (json.topics || []).filter(
          (t) => !selectedTopics.some(s => s.type === t.type && String(s.id) === String(t.id))
        );
        
        setSuggestions(filtered);
        setOpen(filtered.length > 0);
        setHighlight(filtered.length > 0 ? 0 : -1);
      } catch (err) {
        if (err.name !== "AbortError") console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, selectedTopics]);

  function addTopic(topic) {
    onChange?.([...selectedTopics, { type: topic.type, id: String(topic.id), title: topic.title }]);
    setInput("");
    setSuggestions([]);
    setOpen(false);
  }

  function removeTopic(type, id) {
    onChange?.(selectedTopics.filter(t => !(t.type === type && String(t.id) === String(id))));
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight(h => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight(h => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && highlight >= 0) {
      e.preventDefault();
      addTopic(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlight(-1);
    } else if (e.key === "Backspace" && !input && selectedTopics.length > 0) {
      const last = selectedTopics[selectedTopics.length - 1];
      removeTopic(last.type, last.id);
    }
  }

  return (
    <div className="relative w-full">
      <div className="flex flex-wrap gap-2 p-2 min-h-[44px] rounded-lg border border-border bg-muted/30 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
        {selectedTopics.map((topic) => (
          <div
            key={`${topic.type}-${topic.id}`}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs font-medium text-primary shadow-sm animate-in fade-in zoom-in duration-200"
          >
            <span className="opacity-60 uppercase text-[10px] tracking-tighter">{topic.type}</span>
            <span className="max-w-[120px] truncate">{topic.title || topic.id}</span>
            <button
              type="button"
              onClick={() => removeTopic(topic.type, topic.id)}
              className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        
        <div className="relative flex-1 min-w-[120px]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => input.length >= 2 && setOpen(suggestions.length > 0)}
            placeholder={selectedTopics.length === 0 ? placeholder : ""}
            className="w-full bg-transparent border-none outline-none text-sm p-1 placeholder:text-muted-foreground"
          />
          {isLoading && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {open && (
        <div 
          ref={scrollRef}
          className="absolute z-[60] left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl max-h-[280px] overflow-y-auto animate-in slide-in-from-top-2 duration-200"
        >
          {suggestions.map((s, idx) => (
            <div
              key={`${s.type}-${s.id}`}
              onClick={() => addTopic(s)}
              onMouseEnter={() => setHighlight(idx)}
              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                highlight === idx ? "bg-accent text-accent-foreground" : "text-foreground"
              }`}
            >
              <div className="w-10 h-10 shrink-0 rounded-md overflow-hidden bg-muted flex items-center justify-center border border-border/50">
                {s.cover ? (
                  <img src={s.cover} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Hash size={18} className="text-muted-foreground/50" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate">{s.title}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                    {s.type}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate opacity-70">
                  {s.slug}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
