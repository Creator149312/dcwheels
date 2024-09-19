import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Minecraft Challenges Spin Wheel for Fun";
let descriptionStr =
  "Explore Minecraft challenges wheel and spin to pick a random challenge to test you skills.";

let segmentsData = [
  "Mine a stack of a specific resource (Easy)",
  "Build a house (Easy)",
  "Smelt a stack of iron ingots (Easy)",
  "Craft a diamond sword (Easy)",
  "Defeat a creeper (Medium)",
  "Defeat a skeleton (Medium)",
  "Defeat a zombie (Medium)",
  "Mine a diamond (Medium)",
  "Craft a full set of diamond armor (Medium)",
  "Defeat a spider (Medium)",
  "Defeat a creeper without taking damage (Hard)",
  "Defeat a skeleton without taking damage (Hard)",
  "Defeat a zombie without taking damage (Hard)",
  "Defeat a spider without taking damage (Hard)",
  "Defeat a wither (Hard)",
  "Defeat a dragon (Hard)",
  "Build a redstone contraption (Hard)",
  "Craft a beacon (Hard)",
  "Obtain a notch apple (Hard)",
  "Obtain a totem of undying (Hard)",
  "Defeat a wither without taking damage (Expert)",
  "Defeat a dragon without taking damage (Expert)",
  "Build a fully automated farm (Expert)",
  "Obtain a complete set of enchanted diamond armor (Expert)",
  "Obtain a complete set of enchanted golden apples (Expert)",
  "Defeat a wither and a dragon in the same world (Master)",
  "Build a fully automated enderman farm (Master)",
  "Complete a hardcore world (Master)",
  "Obtain a complete set of enchanted netherite armor (Master)",
  "Defeat the ender dragon in a peaceful world (Legendary)",
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
            A Minecraft challenge wheel is a tool designed to present you with a
            variety of in-game challenges tailored to your level. It can be a
            way to check your progress through the game by testing your skills
            with these random challenges.
          </p>
          <p className="mb-3">
            The wheel typically features a central pointer that can be rotated
            to select a challenge from the surrounding options, each with a task
            and a difficulty level associated with completing it.
          </p>
          <p className="mb-3">
            By completing these challenges, you'll gain valuable experience,
            boost your confidence, and become a more skilled Minecraft player.
          </p>
        </div>
      </div>
    </>
  );
}
