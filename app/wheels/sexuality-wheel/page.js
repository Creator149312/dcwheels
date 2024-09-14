import WheelWithInput from "@components/WheelWithInput";

let titleStr = "Sexuality Spin Wheel: Random LGBTQ Orientations";
let descriptionStr =
  "Explore sexuality wheel for LGBTQ community and spin to pick a random sexual orientations and identities.";

let segmentsData = [
  "Heterosexual",
  "Homosexual",
  "Gay",
  "Lesbian",
  "Bisexual",
  "Pansexual",
  "Asexual",
  "Aromantic",
  "Demiromantic",
  "Demisexual",
  "Greysexual",
  "Saphic",
  "Androphilic",
  "Gynephilic",
  "Neutrophiles",
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
            A sexuality spin wheel is a random picker tool designed to help
            LGBTQ individuals explore and identify their sexual orientation. It
            typically features a pointer that can be spun to land on a variety
            of terms related to sexual attraction, such as heterosexual,
            homosexual, bisexual, pansexual, asexual, etc.
          </p>
          <p className="mb-3">
            This tool can be a helpful aid for those who are questioning their
            sexuality or seeking to better understand their sexual identity.
          </p>
        </div>
      </div>
    </>
  );
}
