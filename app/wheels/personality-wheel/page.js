import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Personality Picker Wheel";
let descriptionStr = "Explore " + titleStr + " and spin to pick a random personality.";

let segmentsData = [
  "Extroverted",
  "Introverted",
  "Agreeable",
  "Conscientious",
  "Neurotic",
  "Open-minded",
  "Optimistic",
  "Pessimistic",
  "Assertive",
  "Submissive",
  "Dominant",
  "Independent",
  "Dependent",
  "Creative",
  "Practical",
  "Honest",
  "Deceitful",
  "Humorous",
  "Serious",
  "Empathetic",
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
            Personality Wheel is a fun and interactive game that combines the
            excitement of spinning a wheel with the exploration of personality
            traits. Players spin the wheel which is divided into sections
            representing various personality traits.
          </p>
        </div>
      </div>
    </>
  );
}
