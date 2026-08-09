import { fetchExploreTrending } from "@lib/explore";
import TrendingRail from "./TrendingRail";

export default async function TrendingSection() {
  const trending = await fetchExploreTrending();
  return <TrendingRail items={trending} />;
}
