'use client';
import { useState } from 'react';
import apiConfig from '@utils/ApiUrlConfig';

export default function MigrateCategories() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runMigration = async (limit = 5) => {
    setLoading(true);
    const res = await fetch(`${apiConfig.apiUrl}/migrate-tags`, {
      method: 'POST',
      body: JSON.stringify({ limit }),
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (<></>
    // <div className="p-4 border rounded shadow max-w-md space-y-4">
    //   <h2 className="text-lg font-semibold">Migrate Wheels: Category → Tags</h2>

    //   <button
    //     onClick={() => runMigration(50)}
    //     disabled={loading}
    //     className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
    //   >
    //     {loading ? 'Migrating...' : 'Migrate 25 wheels'}
    //   </button>

    //   <button
    //     onClick={() => runMigration(2000)}
    //     disabled={loading}
    //     className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
    //   >
    //     {loading ? 'Migrating...' : 'M6igrate 2000'}
    //   </button>

    //   {result && (
    //     <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">
    //       <p>{result.message}</p>
    //       <p>Migrated IDs:</p>
    //       <ul className="list-disc list-inside">
    //         {result.migratedIds?.map(id => <li key={id}>{id}</li>)}
    //       </ul>
    //     </div>
    //   )}
    // </div>
  );
}
