'use client';

import { replaceUnderscoreWithDash, replaceUnderscoreWithSpace } from '@utils/HelperFunctions';
import { useState } from 'react';

const CollapsibleCategory = ({ category, links, isOpenByDefault }) => {
  const [isOpen, setIsOpen] = useState(isOpenByDefault);

  // Toggle the collapsible section
  const toggleCollapse = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="mb-6">
      {/* Category Header with toggle button */}
      <div
        onClick={toggleCollapse}
        className="cursor-pointer text-xl font-semibold text-blue-600 hover:text-blue-800 flex justify-between items-center dark:text-blue-400 dark:hover:text-blue-300"
      >
        <span>{category}</span>
        <button className="text-lg">{isOpen ? '-' : '+'}</button>
      </div>

      {/* Collapsible content */}
      <div className={`mt-4 ${isOpen ? '' : 'hidden'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {links.map((link, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow duration-200 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700"
            >
              <a
                href={`/wheels/${replaceUnderscoreWithDash(link)}`}
                className="block text-lg font-medium text-gray-800 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400"
              >
                {replaceUnderscoreWithSpace(link)}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleCategory;
