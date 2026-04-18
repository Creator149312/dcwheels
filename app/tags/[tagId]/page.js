import { notFound } from "next/navigation";
import apiConfig from "@utils/ApiUrlConfig";
import TagWheelsGrid from "@components/TagWheelsGrid"; // We will create this

export async function generateMetadata({ params }) {
  const tag = decodeURIComponent(params.tagId);
  const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1);
  return {
    title: `${capitalizedTag} Decision Picker Wheels`,
    description: `Browse wheels tagged under "${capitalizedTag}".`,
  };
}

export default async function TagDetailPage({ params }) {
  const tagId = decodeURIComponent(params.tagId);
  
  // Fetch only the first 20 wheels on the server
  const res = await fetch(
    `${apiConfig.apiUrl}/wheels-by-tag?tag=${encodeURIComponent(tagId)}&limit=20&skip=0`,
    { next: { revalidate: 3600 } }
  );
  const data = await res.json();
  const initialWheels = data.wheels || [];

  if (!initialWheels) return notFound();

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 bg-white dark:bg-gray-950 min-h-screen">
      <header className="mb-8 border-b border-gray-100 dark:border-gray-900 pb-4">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white capitalize">
          {tagId} <span className="text-blue-600">Wheels</span>
        </h1>
      </header>

      {/* Pass data to the Client Component */}
      <TagWheelsGrid initialWheels={initialWheels} tagId={tagId} />
    </div>
  );
}
