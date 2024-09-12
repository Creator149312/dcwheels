import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Irregular Verbs Picker Wheel";
let descriptionStr = "Explore " + titleStr + " and spin to pick a random task.";

let segmentsData = [
  "Be",
  "Become",
  "Go",
  "Have",
  "Do",
  "Make",
  "Say",
  "See",
  "Take",
  "Tell",
  "Begin",
  "Break",
  "Bring",
  "Build",
  "Buy",
  "Can",
  "Choose",
  "Come",
  "Drink",
  "Drive",
  "Eat",
  "Find",
  "Get",
  "Give",
  "Grow",
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
            Irregular Verbs Wheel is a fun and interactive game that combines
            the excitement of spinning a wheel with the challenge of learning
            irregular verbs. Players spin the wheel which is divided into
            sections representing various irregular verbs.
          </p>
        </div>
      </div>
    </>
  );
}
