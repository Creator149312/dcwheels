/*this file works on creating links to different categories of Wheels */
import CollapsibleCategory from "@components/CollapsibleCategory";
import WheelData from "@data/WheelData";

export const metadata = {
  title: "Wheels Explorer",
  description: "Explore all wheels in Spinpapa and find the one you need.",
};

// Function to group the keys by category and return an array of JSONs
function groupJsonByCategory(jsons) {
  const categoryGroups = {};

  // Group JSON keys by category
  for (const key in jsons) {
    const category = jsons[key].category;

    // If category doesn't exist, create an empty array
    if (!categoryGroups[category]) {
      categoryGroups[category] = [];
    }

    // Add the current key to the category's array
    categoryGroups[category].push(key);
  }

  // Create an array of JSONs with 'category' and 'keys' properties
  const result = Object.keys(categoryGroups).map((category) => ({
    category,
    links: categoryGroups[category],
  }));

  return result;
}

const CategoriesPage = async () => {
  // Call the function and store the result
  const categories = groupJsonByCategory(WheelData);

  return (
    <div className="container mx-auto px-4 py-6 dark:text-white">
      {/* Page Title */}
      <h1 className="text-3xl font-bold text-center mb-8 dark:text-white">
        Wheels Explorer{" "}
      </h1>

      {/* Page Description */}
      <p className="text-lg text-gray-700 mb-6 text-center dark:text-gray-300">
        Discover picker wheels related to a wide range of topics across various
        categories, including Animals, Education, and Games.
      </p>

      <div className="mx-10">
        {/* Sections with Collapsible Categories */}
        {categories.map((categoryData, index) => (
          <div key={index} className="mb-12">
            <CollapsibleCategory
              category={categoryData.category}
              links={categoryData.links}
              isOpenByDefault={true} // Always show the content for SEO
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoriesPage;
