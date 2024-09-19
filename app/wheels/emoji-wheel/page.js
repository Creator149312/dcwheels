import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Emoji Picker Wheel";
let descriptionStr =
  "Explore " + titleStr + " and spin to pick a random emoji.";

let segmentsData = [
  "👍 (Thumbs up)",
  "😊 (Smiling face)",
  "😂 (Laughing face)",
  "❤️ (Heart)",
  "😭 (Crying face)",
  "🥰 (Smiling face with hearts)",
  "🤯 (Face with steam coming out of ears)",
  "😲 (Astonished face)",
  "🤪 (Zany face)",
  "🤨 (Raised eyebrow)",
  "😒 (Unhappy face)",
  "😡 (Angry face)",
  "🤬 (Face with symbols over mouth)",
  "😱 (Screaming face)",
  "🥱 (Yawning face)",
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
            Emoji Wheel is a fun and interactive game that combines the
            excitement of spinning a wheel with the popularity of emojis.
            Players spin the wheel which is divided into sections representing
            various emojis. The outcome of the spin reveals a fun fact or trivia
            about the emoji.
          </p>
        </div>
      </div>
    </>
  );
}
