import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import SignOut from "@components/user/SignOut";
import { HiOutlineUserCircle } from "react-icons/hi";

const UserDropDownMenu = ({ name, setOpen}) => {
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
        <a href="/">New Wheel + </a></DropdownMenuItem>
        <DropdownMenuItem><a href="/dashboard">Dashboard</a></DropdownMenuItem>
        {/* <DropdownMenuItem><Link href="/settings">Settings</Link></DropdownMenuItem> */}
        <DropdownMenuItem><SignOut /></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropDownMenu;
