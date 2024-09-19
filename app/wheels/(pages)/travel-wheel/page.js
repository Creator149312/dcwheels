import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Travel Wheel - Pick Destinations for Vacation";
let descriptionStr =
  "Explore Travel wheel and spin to pick a random destination around the world to spend your vacation.";

let segmentsData = [
  "Eiffel Tower, Paris, France",
  "Varanasi, India",
  "Statue of Liberty, New York, USA",
  "Great Wall of China, China",
  "Ajanta and Ellora Caves, India",
  "Machu Picchu, Peru",
  "Angkor Wat, Cambodia",
  "Golden Gate Bridge, San Francisco, USA",
  "Rajasthan, India",
  "Burj Khalifa, Dubai, UAE",
  "Sydney Opera House, Australia",
  "Colosseum, Rome, Italy",
  "Hampi, India",
  "Grand Canyon, Arizona, USA",
  "Niagara Falls, Canada/USA",
  "Christ the Redeemer, Brazil",
  "Petra, Jordan",
  "Santorini, Greece",
  "Taj Mahal, India",
  "Chichen Itza, Mexico",
  "Pyramids of Giza, Egypt",
  "Mount Fuji, Japan",
  "Sagrada Familia, Spain",
  "Goa, India",
  "Acropolis of Athens, Greece",
  "Neuschwanstein Castle, Germany",
  "Yellowstone National Park, Wyoming, USA",
  "Venice, Italy",
  "Big Ben, London, UK",
  "The Great Barrier Reef, Australia",
  "Rishikesh, India",
];

export const metadata = {
  title: titleStr,
  description: descriptionStr,
};

export default async function Page({ params }) {
  return (
    <>
      <WheelWithInput newSegments={segmentsData} />
      <div className="p-3">
        <h1 className="text-4xl mb-2">{titleStr}</h1>
        <div className="text-lg">
          <p className="mb-3">
            A travel spin wheel is a tool to help you
            decide on your next travel destination. It consists of different sections, each representing a different
            travel destination around the world. Users can spin the wheel and
            land on a random destination, providing a unique and exciting way to
            choose where to go on your next expedition.
          </p>
          <p>
            The destinations on a travel spin wheel can vary widely, from exotic
            and far-off locations to local hotspots and hidden gems. Some travel
            spin wheels may focus on specific regions or themes, such as beach
            destinations, national parks, or historic cities.
          </p>
          <p>
            Using a travel spin wheel can add an element of surprise and
            excitement to your vacation planning, and it can be a great way to
            discover new destinations you may not have considered otherwise.
            It&#039;s also a fun activity to do with friends or family as you
            can take turns spinning the wheel and discussing potential travel
            plans.
          </p>
        </div>
      </div>
    </>
  );
}
