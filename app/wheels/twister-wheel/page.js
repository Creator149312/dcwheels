import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Twister Spinner Wheel - Generate Random Moves";
let descriptionStr =
  "Explore Twister spinner wheel and spin to pick a random move for a player.";

let segmentsData = [
  "Left hand on red",
  "Left hand on yellow",
  "Left hand on green",
  "Left hand on blue",
  "Right hand on red",
  "Right hand on yellow",
  "Right hand on green",
  "Right hand on blue",
  "Left foot on red",
  "Left foot on yellow",
  "Left foot on green",
  "Left foot on blue",
  "Right foot on red",
  "Right foot on yellow",
  "Right foot on green",
  "Right foot on blue",
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
            A twister spin wheel is a circular game board that is used to play
            the popular game Twister. It is typically made of a large, colorful
            mat with circles of different colors arranged in rows and columns.
          </p>
          <p className="mb-3">
            Players take turns spinning the wheel, which indicates a body part
            (left hand, right hand, left foot, or right foot) and a color. They
            must then place that body part on the corresponding colored circle
            on the mat, creating increasingly challenging and often hilarious
            poses. It is a fun and energetic game that is perfect for parties and
            gatherings with friends.
          </p>
        </div>
      </div>
    </>
  );
}
