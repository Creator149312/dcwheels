import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Fortnite Challenges Wheel for Fun";
let descriptionStr =
  "Explore Fortnite challenges wheel and spin to pick a random challenge for your next game.";

let segmentsData = [
  "Eliminate an opponent (Easy)",
  "Land at a specific location (Easy)",
  "Deal damage to opponents (Easy)",
  "Complete a time trial (Easy)",
  "Collect a certain number of chests (Medium)",
  "Deal damage to opponents with a specific weapon (Medium)",
  "Eliminate opponents with a specific weapon (Medium)",
  "Land a headshot (Medium)",
  "Complete a timed obstacle course (Medium)",
  "Eliminate opponents in a specific location (Medium)",
  "Complete a timed elimination challenge (Hard)",
  "Deal damage to opponents from a specific distance (Hard)",
  "Eliminate opponents from a specific distance (Hard)",
  "Complete a timed building challenge (Hard)",
  "Land a specific number of headshots in a single match (Hard)",
  "Eliminate opponents with a specific weapon from a specific distance (Expert)",
  "Win a match without taking damage (Expert)",
  "Complete a timed elimination challenge with specific conditions (Expert)",
  "Eliminate opponents with a specific weapon in a specific location (Expert)",
  "Win a match without using a healing item (Expert)",
  "Complete a timed building challenge with specific conditions (Master)",
  "Win a match without building (Master)",
  "Eliminate opponents with a specific weapon from a specific distance in a specific location (Master)",
  "Win a match using only a specific weapon (Master)",
  "Complete a timed elimination challenge with multiple objectives (Master)",
  "Win a match without landing on the ground (Epic)",
  "Eliminate opponents with a specific weapon while riding a vehicle (Epic)",
  "Win a match without using any weapons (Epic)",
  "Complete a timed elimination challenge in a specific mode (Epic)",
  "Win a match without taking damage, building, or using healing items (Legendary)",
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
            A Fortnite challenge wheel is a tool to presents you with a variety of in-game challenges
            tailored to your skill level.
          </p>
          <p className="mb-3">
            The wheel typically features a central pointer that can be rotated
            to select a challenge from the surrounding options, each with a task
            and difficulty level to boost your confidence and improve your
            gameplay.
          </p>
          <p className="mb-3">
            By completing these challenges, you'll unlock rewards and gain
            valuable experience, helping you become a more skilled Fortnite
            player.
          </p>
        </div>
      </div>
    </>
  );
}
