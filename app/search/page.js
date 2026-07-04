import SearchDiscovery from "@components/search/SearchDiscovery";

export const metadata = {
  title: "Find Spin Wheels",
  description: "Find the spin wheels you are looking for",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <SearchDiscovery />
    </div>
  );
}
