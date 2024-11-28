import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";

let titleStr = "Age Spin Wheel - Pick Age Groups";
let descriptionStr =
  "Explore Age wheel and spin to pick a random age group for a task.";

let segmentsData = [
  "Infancy: 0-1 years",
  "Toddlerhood: 1-3 years",
  "Preschool: 3-5 years",
  "Early childhood: 5-8 years",
  "Late childhood: 8-12 years",
  "Early adolescence: 12-14 years",
  "Middle adolescence: 14-16 years",
  "Late adolescence: 16-18 years",
  "Early adulthood: 18-25 years",
  "Middle adulthood: 25-44 years",
  "Late adulthood: 45-64 years",
  "Elderly: 65+ years",
  "Newborn: A baby who has recently been born",
  "Infant: A baby from birth to about 1 year old",
  "Toddler: A child who is learning to walk",
  "Preschooler: A child aged 3-5 years",
  "Child: A child attending school (typically ages 6-18)",
  "Teenager: A young person aged 13-19",
  "Young adult: An adult in their 20s or early 30s",
  "Middle-aged adult: An adult in their 30s, 40s, or 50s",
  "Older adult: An adult in their 60s or older",
  "Senior citizen: A person who is 65 years old or older",
  "Centennial: A person who is 100 years old",
  "Supercentenarian: A person who is 110 years old or older",
];

export const metadata = {
  title: titleStr,
  description: descriptionStr,
};

export default async function Page({ params }) {
  return (
    <>
      {/* <WheelWithInput newSegments={segmentsData} /> */}
      <WheelWithInputContentEditable newSegments={segmentsData} />
      <div className="p-3">
        <h1 className="text-4xl mb-2">{titleStr}</h1>
        <div className="text-lg">
          <p className="mb-3">
            An age spin wheel is a fun and interactive tool that can be used for
            various purposes. It is a circular board with different ages written
            on it, allowing you to randomly select an age. Whether you are
            playing a game, making a random decision, or simply looking for a
            fun way to pass the time, an age spin wheel can provide a unique and
            entertaining experience.
          </p>
        </div>
      </div>
    </>
  );
}
