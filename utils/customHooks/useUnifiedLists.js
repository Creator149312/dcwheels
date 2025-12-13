import { useState, useEffect } from "react";
import apiConfig from "@utils/ApiUrlConfig";
import { useSession } from "next-auth/react";

const useUnifiedLists = () => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { status, data: session } = useSession();

  useEffect(() => {
    // ✅ Case 1: User is NOT logged in
    if (status !== "authenticated") {
      setLists([]);
      setError("");
      setLoading(false);
      return;
    }

    // ✅ Case 2 & 3: User is logged in → fetch lists
    const fetchUnifiedLists = async () => {
      try {
        const res = await fetch(`${apiConfig.apiUrl}/unifiedlist`);

        if (!res.ok) {
          throw new Error("Failed to fetch unified lists");
        }

        const data = await res.json();

        // ✅ Case 2: User logged in but NO lists
        if (!data.lists || data.lists.length === 0) {
          setLists([]);
          setError("");
        } else {
          // ✅ Case 3: User logged in AND has lists
          setLists(data.lists);
          setError("");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUnifiedLists();
  }, [status, session?.user?.email]);

  return { lists, loading, error };
};

export default useUnifiedLists;
