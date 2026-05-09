import ChallengesClient from "./ChallengesClient";

export const metadata = {
  title: "Challenge Board — Spin, Watch, Prove It | SpinPapa",
  description:
    "Complete challenges by spinning the wheel and actually following through. Watch anime, play games, and earn exclusive badges to show off on your profile.",
  openGraph: {
    title: "Challenge Board | SpinPapa",
    description:
      "Spin the wheel, follow through, and earn badges. Anime, movie, game and character challenges available.",
    url: "/challenges",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Challenge Board | SpinPapa",
    description: "Earn badges by completing spin challenges.",
  },
};

export default function ChallengesPage() {
  return <ChallengesClient />;
}
