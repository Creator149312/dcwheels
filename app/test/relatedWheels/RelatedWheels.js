"use client";

export default function RelatedWheels({ relatedWheels }) {
  return (
    <aside
      className="hidden lg:block 
                 lg:w-64 xl:w-80 
                 p-1 min-h-[24rem] 
                "
    >
      <h4
        className="text-base font-semibold mb-4 text-center 
                   bg-gray-100 dark:bg-gray-800 
                   text-gray-900 dark:text-gray-100 
                   py-2 rounded px-0"
      >
        Wheels Mix
      </h4>

      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {relatedWheels.map((wheel) => (
          <a
            key={wheel._id}
            href={`/uwheels/${wheel._id}`}
            className="flex items-center space-x-3 cursor-pointer 
                       hover:bg-gray-100 dark:hover:bg-gray-800 
                       p-2 rounded-lg transition border border-transparent 
                       hover:border-gray-300 dark:hover:border-gray-600"
          >
            {/* Wheel icon instead of thumbnail */}
            {/* <div
              className="flex-shrink-0 flex items-center justify-center 
                         w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"
            >
              <GiCartwheel className="w-7 h-7 text-gray-700 dark:text-gray-300" />
            </div> */}

            {/* Text content */}
            <div className="flex flex-col">
              <span
                className="font-medium text-sm line-clamp-2 
                           text-gray-900 dark:text-gray-100"
              >
                {wheel.title}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {wheel.data?.length} items
              </span>
            </div>
          </a>
        ))}
      </div>
    </aside>
  );
}
