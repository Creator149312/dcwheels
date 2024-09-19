import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Emotions Picker Wheel";
let descriptionStr = "Explore " + titleStr + " and spin to pick a random emotion.";

let segmentsData = [
  "Happiness",
  "Sadness",
  "Anger",
  "Fear",
  "Surprise",
  "Love",
  "Hate",
  "Guilt",
  "Pride",
  "Jealousy",
  "Embarrassment",
  "Empathy",
  "Gratitude",
  "Shame",
  "Joy",
  "Contentment",
  "Satisfaction",
  "Grief",
  "Sorrow",
  "Despair",
  "Melancholy",
  "Rage",
  "Irritation",
  "Anxiety",
  "Dread",
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
            Emotions Wheel is a fun and interactive game that combines the
            excitement of spinning a wheel with the exploration of human
            emotions. Players spin the wheel which is divided into sections
            representing various emotions. The outcome of the spin reveals a
            description or definition of the emotion.
          </p>
        </div>
      </div>
    </>
  );
}
