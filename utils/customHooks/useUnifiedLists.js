import { useState, useEffect } from "react";
import apiConfig from "@utils/ApiUrlConfig";

const useUnifiedLists = () => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUnifiedLists = async () => {
      try {
        const res = await fetch(`${apiConfig.apiUrl}/unifiedlist`);

        if (!res.ok) {
          throw new Error("Failed to fetch unified lists");
        }

        const data = await res.json();

        if (data.lists && data.lists.length > 0) {
          setLists(data.lists);
          setError("");
        } else {
          setLists([]);
          setError("");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUnifiedLists();
  }, []);

  return { lists, loading, error };
};

export default useUnifiedLists;
