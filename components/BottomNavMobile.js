// components/BottomNavBar.js
import Link from "next/link";
import { AiFillHome } from "react-icons/ai";
import { MdOutlineSubscriptions } from "react-icons/md";
import { FaUserCircle } from "react-icons/fa";
import { IoMdAddCircle } from "react-icons/io";
import { SiYoutubeshorts } from "react-icons/si";

export default function BottomNavMobile() {
  return (<></>
    // <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-50 md:hidden">
    //   <div className="flex justify-between items-center px-4 py-2 text-gray-700 text-xs">
    //     <NavItem href="/home" icon={<AiFillHome size={24} />} label="Home" />
    //     <NavItem href="/shorts" icon={<SiYoutubeshorts size={24} />} label="Shorts" />
    //     <NavItem
    //       href="/upload"
    //       icon={<IoMdAddCircle size={36} className="text-red-500" />}
    //       center
    //     />
    //     <NavItem
    //       href="/subscriptions"
    //       icon={<MdOutlineSubscriptions size={24} />}
    //       label="Subscriptions"
    //     />
    //     <NavItem
    //       href="/profile"
    //       icon={<FaUserCircle size={24} />}
    //       label="Profile"
    //     />
    //   </div>
    // </nav>
  );
}

function NavItem({ href, icon, label, center = false }) {
  return (
    <Link href={href} className={`flex flex-col items-center ${center ? "-mt-5" : ""}`}>
      {icon}
      {label && <span className="mt-1 text-[10px]">{label}</span>}
    </Link>
  );
}
