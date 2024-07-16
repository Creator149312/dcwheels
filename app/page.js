import ReactCustomRoulette from "@components/ReactCustomRoulette";
import WheelWithInput from "@components/WheelWithInput";

export default function Home() {
  return (
    <WheelWithInput
      newSegments={["Karna", "Arjun", "Robert", "Alfredo", "Nathalie"]}
    />
  );
}
