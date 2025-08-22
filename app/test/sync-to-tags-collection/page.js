'use client';

import { useState } from 'react';

export default function SyncTagsPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatedTags, setUpdatedTags] = useState([]);

  const syncTags = async (limit) => {
    setLoading(true);
    setMessage('');
    setUpdatedTags([]);

    try {
      const res = await fetch('/api/sync-tags-to-collection', {
        method: 'POST',
        body: JSON.stringify({ limit }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
        setUpdatedTags(data.updatedTags || []);
      } else {
        setMessage(data.error || 'Something went wrong');
      }
    } catch (err) {
      setMessage('Failed to sync tags');
    } finally {
      setLoading(false);
    }
  };

  return (<></>
    // <div className="max-w-2xl mx-auto p-4">
    //   <h2 className="text-xl font-semibold mb-4">Sync Tags from Wheels</h2>

    //   <div className="flex gap-4 mb-4">
    //     <button
    //       onClick={() => syncTags(10)}
    //       disabled={loading}
    //       className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    //     >
    //       Sync 10 Wheels
    //     </button>
    //     <button
    //       onClick={() => syncTags(2000)}
    //       disabled={loading}
    //       className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
    //     >
    //       Sync 100 Wheels
    //     </button>
    //   </div>

    //   {loading && <p className="text-gray-600">Syncing...</p>}
    //   {message && <p className="text-gray-800 font-medium">{message}</p>}

    //   {updatedTags.length > 0 && (
    //     <div className="mt-4">
    //       <h4 className="font-semibold">Updated Tags:</h4>
    //       <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-200">
    //         {updatedTags.map((tag, i) => (
    //           <li key={i}>{tag}</li>
    //         ))}
    //       </ul>
    //     </div>
    //   )}
    // </div>
  );
}
