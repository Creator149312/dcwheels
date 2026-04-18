import { useState } from "react";
import apiConfig from "@utils/ApiUrlConfig";
import { useSession } from "next-auth/react";

const useUnifiedLists = () => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fetched, setFetched] = useState(false);

  const { status } = useSession();

  const fetchLists = async () => {
    if (fetched || status !== "authenticated") return;

    setLoading(true);
    try {
      const res = await fetch(`${apiConfig.apiUrl}/unifiedlist`);
      if (!res.ok) throw new Error("Failed to fetch unified lists");
      const data = await res.json();
      setLists(data.lists || []);
      setError("");
      setFetched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { lists, loading, error, fetched, fetchLists };
};

export default useUnifiedLists;
