import { useState, useEffect } from 'react';

const useLists = (title = null) => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLists = async () => {
      try {
        const res = await fetch('/api/lists');
        if (!res.ok) {
          throw new Error('Failed to fetch lists');
        }

        const data = await res.json();

        // If a title is provided, filter lists by title
        if (title) {
          const filteredLists = data.lists.filter((list) =>
            list.title.toLowerCase().includes(title.toLowerCase())
          );
          setLists(filteredLists);
        } else {
          setLists(data.lists); // Return all lists if no title is provided
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLists();
  }, [title]); // Depend on title so the hook reruns when title changes

  return { lists, loading, error };
};

export default useLists;
