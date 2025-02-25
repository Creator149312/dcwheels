"use client";

import { useSession } from "next-auth/react";
import WheelList from "@components/WheelList";
import { useRouter } from "next/navigation";
import { Button } from "@components/ui/button";
import ListDashboard from "./lists/ListDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

export default function UserDashboard() {
  const { status, data: session } = useSession();
  const router = useRouter();

  if (status === "authenticated" || session?.user?.email !== undefined) {
    return (
      <div className="m-3 p-10">
        <h1 className="text-3xl font-bold mb-4 text-center">Dashboard</h1>
        <Tabs defaultValue="wheels">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="wheels">Wheels</TabsTrigger>
            <TabsTrigger value="lists">Lists</TabsTrigger>
          </TabsList>
          <TabsContent value="wheels">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold mb-2">My Wheels</h2>
              <a href={"./"}>
                <Button size={"lg"} variant={"default"}>
                  Create Wheel +
                </Button>
              </a>
            </div>
            <WheelList createdBy={session?.user?.email} />
          </TabsContent>
          <TabsContent value="lists">
            <ListDashboard />
          </TabsContent>
        </Tabs>
      </div>
    );
  } else {
    if (session !== null) {
      //if is used till the time browser fetches the session data
      return (
        <div className="flex justify-center items-center">
          <p>Creating Your Dashboard...</p>
        </div>
      );
    } else {
      return (
        <div className="flex justify-center items-center">
          <a className="cursor-pointer custom-button" href="/login">
            <Button size={"lg"} variant={"default"}>
              Login
            </Button>{" "}
            to see your Dashboard.
          </a>
        </div>
      );
    }
  }
}
