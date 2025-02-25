import { useState, useEffect } from "react";
import apiConfig from "@utils/ApiUrlConfig";
import { useSession } from "next-auth/react";

const useLists = (title = null, userSpecific) => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { status, data: session } = useSession();

  useEffect(() => {
    // Case 1: User is not logged in
    if (status !== "authenticated") {
      setLoading(false);
      setLists([]);
      setError("");
      return;
    }

    // Case 2: User is logged in but no lists available
    const fetchLists = async () => {
      try {
        let fetchURL = `${apiConfig.apiUrl}/list`;
        if (userSpecific) {
          fetchURL = `${apiConfig.apiUrl}/list/user/${session?.user?.email}`;
        }

        const res = await fetch(fetchURL);

        if (!res.ok) {
          throw new Error("Failed to fetch lists");
        }

        const data = await res.json();

        // Case 2: User has no lists
        if (data.lists && data.lists.length === 0) {
          setLists([]);
          setError("");
        } else {
          // Case 3: User is logged in and has lists
          if (title) {
            const filteredLists = data.lists.filter((list) =>
              list.title.toLowerCase().includes(title.toLowerCase())
            );
            setLists(filteredLists);
          } else {
            setLists(data.lists); // Return all lists if no title is provided
          }
          setError("");
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLists();
  }, [title, status, session?.user?.email, userSpecific]); // Depend on the session and userSpecific

  return { lists, loading, error };
};

export default useLists;
