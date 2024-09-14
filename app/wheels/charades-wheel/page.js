import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Charades Wheel - Generate Random Ideas";
let descriptionStr =
  "Explore Charades wheel and spin to pick a random word or topic for next game session with your family.";

let segmentsData = [
  "Elephant",
  "Calculator",
  "Jumping",
  "Sadness",
  "Mountain",
  "Library",
  "Giraffe",
  "Computer",
  "Dancing",
  "Anger",
  "Beach",
  "Penguin",
  "Door",
  "Crying",
  "City",
  "Shark",
  "Guitar",
  "Sleeping",
  "Fear",
  "Hospital",
  "Squirrel",
  "Microwave",
  "Eating",
  "Hope",
  "Restaurant",
  "Zebra",
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
            A charades wheel is a family-friendly game that provides a random
            selection of topics for your next charade session. Whether you're an
            adult or a child, this wheel offers a variety of ideas, from naughty
            to nice. 
          </p>
          <p className="mb-3">Spin the wheel to reveal a random topic, whether it's a
            movie, a famous person, or an action. This generator ensures endless
            fun and laughter for your next game night.</p>
          <p className="mb-3">
            Each topic is displayed as a word or phrase around the wheel's
            circumference. This design provides a quick and easy way to choose a
            new charade topic, adding an element of surprise and excitement to
            the game.
          </p>
        </div>
      </div>
    </>
  );
}
