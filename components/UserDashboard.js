"use client";

import { useSession } from "next-auth/react";
import WheelList from "@components/WheelList";
import { useRouter } from "next/navigation";
import { Button } from "@components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import DashboardPage from "./lists/DashboardPage";
import { Suspense } from "react";
import ListDashboard from "./lists/ListDashboard";

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
      <div className="h-40 bg-gray-300 dark:bg-gray-700 rounded"></div>
      <div className="h-40 bg-gray-300 dark:bg-gray-700 rounded"></div>
      <div className="h-40 bg-gray-300 dark:bg-gray-700 rounded"></div>
    </div>
  );
}

export default function UserDashboard() {
  const { status, data: session } = useSession();
  const router = useRouter();

  // ✅ Use Suspense-style skeleton when session is loading
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen w-full">
        <LoadingSkeleton />
      </div>
    );
  }

  // ✅ Not logged in
  if (!session?.user?.email) {
    return (
      <div className="flex justify-center items-center h-screen">
        <a href="/login">
          <Button size="lg">Login to see your Dashboard</Button>
        </a>
      </div>
    );
  }

  // ✅ Logged in — show dashboard
  return (
    <div className="m-2 p-4 sm:m-6 sm:p-10 bg-gray-50 dark:bg-gray-900 min-h-screen rounded-xl shadow-sm">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">
        Dashboard
      </h1>

      <Tabs defaultValue="wheels" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-200 dark:bg-gray-800 rounded-lg">
          <TabsTrigger
            value="wheels"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
          >
            Wheels
          </TabsTrigger>

          <TabsTrigger
            value="lists"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
          >
            Lists
          </TabsTrigger>
        </TabsList>

        {/* ✅ Wheels Tab */}
        <TabsContent value="wheels" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              My Wheels
            </h2>

            <a href="/">
              <Button size="lg">Create Wheel +</Button>
            </a>
          </div>

          <Suspense fallback={<LoadingSkeleton />}>
            <WheelList createdBy={session.user.email} />
          </Suspense>
        </TabsContent>

        {/* ✅ Lists Tab */}
        <TabsContent value="lists" className="mt-6">
          {/* <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            My Lists
          </h2> */}

          <Suspense fallback={<LoadingSkeleton />}>
            <DashboardPage createdBy={session.user.email} />
            {/* <ListDashboard /> */}
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
