import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Gender Picker Wheel";
let descriptionStr =
  "Explore " + titleStr + " and spin to pick a random gender.";

let segmentsData = [
  "Male",
  "Female",
  "Non-binary",
  "Genderfluid",
  "Agender",
  "Genderqueer",
  "Transgender",
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
            Gender Wheel is a fun and interactive game that combines the
            excitement of spinning a wheel with the exploration of gender
            identity. Players spin the wheel which is divided into sections
            representing various gender identities. The outcome of the spin
            reveals a brief description or definition of the gender.
          </p>
        </div>
      </div>
    </>
  );
}
