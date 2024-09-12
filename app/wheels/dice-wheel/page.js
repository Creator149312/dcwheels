import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Dice Wheel - Roll a Dice";
let descriptionStr =
  "Explore " + titleStr + " and spin to pick a random outcome of dice.";

let segmentsData = ["1", "2", "3", "4", "5", "6"];

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
            Dice Wheel is a unique game that combines the randomness of a dice
            roll with the excitement of a spinning wheel. Players spin a wheel
            with different dice faces. When the wheel stops the player rolls the
            corresponding dice.
          </p>
        </div>
      </div>
    </>
  );
}
