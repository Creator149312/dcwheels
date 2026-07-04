import GlobalSpinFeed from "@components/GlobalSpinFeed";
import { connectMongoDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export default async function Home() {
  await connectMongoDB();
  
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Global Feed</h1>
        <p className="text-muted-foreground text-sm mt-1">Discover trending wheels, polls, and discussions.</p>
      </div>
      <GlobalSpinFeed stories={[]} />
    </div>
  );
}
