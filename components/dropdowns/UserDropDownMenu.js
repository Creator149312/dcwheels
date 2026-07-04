import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import SignOut from "@components/user/SignOut";
import Link from "next/link";
import { UserCircle, LogOut, BarChart2, Disc3 } from "lucide-react";
import { ThemeToggleSwitch } from "@components/ThemeToggleSwitch";

const UserDropDownMenu = ({ name, username, setOpen }) => {
  const profileUrl = `/u/${encodeURIComponent((username || name).toLowerCase())}`;
  
  return (
     <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center focus:outline-none">
          <UserCircle size={38} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-52 z-[1000] mr-2"
      >
        <DropdownMenuLabel>{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem>
          <BarChart2 size={20} className="mr-2" />
          <Link href={profileUrl}>Profile</Link>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <Disc3 size={20} className="mr-2" />
          <a href="/">New Wheel +</a>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <ThemeToggleSwitch />
        </DropdownMenuItem>

        <DropdownMenuItem>
          <LogOut size={20} className="mr-2" />
          <SignOut />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropDownMenu;
