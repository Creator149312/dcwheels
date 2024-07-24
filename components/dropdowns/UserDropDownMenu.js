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
import { HiOutlineUserCircle } from "react-icons/hi";

const UserDropDownMenu = ({ name }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <div className="flex center-align">
          <HiOutlineUserCircle size={38} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
        <Link href="/">New Wheel + </Link></DropdownMenuItem>
        <DropdownMenuItem><Link href="/dashboard">Dashboard</Link></DropdownMenuItem>
        <DropdownMenuItem><Link href="/settings">Settings</Link></DropdownMenuItem>
        <DropdownMenuItem><SignOut /></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropDownMenu;
