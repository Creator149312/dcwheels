'use client';

import { useState } from 'react';

export default function Page() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRun = async (limit = '10') => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/fix-tags?limit=${limit}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessage(data.message);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (<></>
    // <div className="max-w-md mx-auto mt-8 p-4 bg-white dark:bg-gray-900 rounded shadow">
    //   <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100">Fix Wheel Tags</h2>

    //   <div className="space-y-2">
    //     <button
    //       onClick={() => handleRun('10')}
    //       disabled={loading}
    //       className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
    //     >
    //       Run for 10 entries (Test)
    //     </button>

    //     <button
    //       onClick={() => handleRun('all')}
    //       disabled={loading}
    //       className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
    //     >
    //       Run for all entries
    //     </button>
    //   </div>

    //   {message && (
    //     <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
    //       {message}
    //     </p>
    //   )}
    // </div>
  );
}
