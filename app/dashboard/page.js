'use client'

import { useSession } from "next-auth/react";
import WheelList from "@components/WheelList";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Page() {
  const { status, data: session } = useSession();
  const router = useRouter();

  console.log("Session Inside Dashboard", session);

  if (status === "authenticated" || session?.user?.email !== undefined) {
    return (
      <div className="m-3">
        <h1>Dashboard</h1>
        <div className="list-heading-container">
          <h2>My Lists</h2>
          <Link href={'./lists/addList'} className="custom-button">Create List + </Link>
        </div>
         <WheelList createdBy={session?.user?.email} /> 
      </div>
    );
  } else {
    if (session !== null) { //if is used till the time browser fetches the session data
      return <p>Fetching Your Lists ...</p>
    } else {
      return <a className="cursor-pointer custom-button" href="/login">Login</a>;
    }
  }
}