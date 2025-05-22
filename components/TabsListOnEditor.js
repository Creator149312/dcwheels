import React from "react";
import { TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import {
  FaEye,
  FaEyeSlash,
  FaPencilRuler,
  FaExpand,
  FaRegWindowClose,
} from "react-icons/fa";
import Tooltip from "./Tooltip";
import SettingsAdv from "./SettingsAdv";

const TabsListOnEditor = ({
  segData,
  resultList,
  isVisible,
  toggleVisibility,
  handleToggle,
  isFullScreen,
  advOptions
}) => {
  return (
    <>
      <TabsTrigger value="list">
        List <span className="ml-2">{segData.length}</span>
      </TabsTrigger>
      <TabsTrigger value="result">
        Result
        <span className="ml-2">
          {resultList.length === 0 ? 0 : resultList.length}
        </span>
      </TabsTrigger>
      <div className="flex space-x-1">
        <Tooltip text={isVisible ? "Hide Editor" : "Show Editor"}>
          <Button
            onClick={toggleVisibility}
            className="my-1 px-2 py-0 h-7 text-xs"
          >
            {isVisible ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
          </Button>
        </Tooltip>

        {/* <Settings /> */}
        <SettingsAdv advOptions={advOptions}/>
        {/* Button to Handle FullScreen Toggle */}
        <Tooltip text="Fullscreen">
          <Button
            onClick={handleToggle}
            className={`my-1 px-2 py-0 h-7 text-xs`}
          >
            <FaExpand size={20} />
          </Button>
        </Tooltip>
      </div>
    </>
  );
};

export default TabsListOnEditor;
