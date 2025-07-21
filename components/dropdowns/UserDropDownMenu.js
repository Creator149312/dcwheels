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
import { HiOutlineLogout } from "react-icons/hi";
import { HiOutlineClipboardList } from "react-icons/hi";
import { HiOutlinePresentationChartBar } from "react-icons/hi";
import { GiCartwheel } from "react-icons/gi";
import { GiCutDiamond } from "react-icons/gi";
import CoinsManager from "@app/test/gamification/CoinsManager";
import { useContext } from "react";
import { SegmentsContext } from "@app/SegmentsContext";
import { ThemeToggleSwitch } from "@components/ThemeToggleSwitch";

const UserDropDownMenu = ({ name, setOpen }) => {
  const {coins} = useContext(SegmentsContext);
  return (
     <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center focus:outline-none">
          <HiOutlineUserCircle size={38} />
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
          <HiOutlinePresentationChartBar size={20} className="mr-2" />
          <a href="/dashboard">Dashboard</a>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <GiCartwheel size={20} className="mr-2" />
          <a href="/">New Wheel +</a>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <ThemeToggleSwitch />
        </DropdownMenuItem>

        <DropdownMenuItem>
          <HiOutlineLogout size={20} className="mr-2" />
          <SignOut />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropDownMenu;
