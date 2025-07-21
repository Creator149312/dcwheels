import { Card } from "@components/ui/card";

// components/WheelCard.js
export default function WheelCard({ wheel }) {
  return (
    <a href={`/uwheels/${wheel._id}`}>
      <Card
        className="p-4 sm:p-6 mt-4 rounded-md bg-white dark:bg-gray-800 
                   hover:shadow-xl hover:scale-[1.01] hover:-translate-y-1 
                   transition-all duration-300 ease-in-out 
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
        tabIndex={0} // for keyboard accessibility
      >
        <div className="text-base leading-normal flex justify-between items-center">
          <div className="w-[80%]">
            <h2 className="font-medium mb-1">{wheel.title}</h2>
          </div>
        </div>
      </Card>
    </a>
  );
}
