import { Fragment } from "react";
import AdsUnit from "@components/ads/AdsUnit";
import LoadMoreWheels from "./LoadMoreWheels";
import SearchEmptyState from "@components/search/SearchEmptyState";
import WheelCard from "@components/search/WheelCard";

export default function WheelsSection({
  searchtitle,
  wheelList,
  wheelTotal,
  initialStart,
}) {
  if (!wheelList || wheelList.length === 0) {
    return <SearchEmptyState query={searchtitle} label="wheels" />;
  }

  return (
    <div>
      <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4 font-medium">
        Found {wheelTotal} spin wheel{wheelTotal !== 1 ? "s" : ""}
      </p>
      <div className="grid grid-cols-1 gap-2.5 md:gap-4">
        {wheelList.map((item, index) => (
          <Fragment key={item._id || `wheel-${index}`}>
            <WheelCard item={item} />
            {(index + 1) % 7 === 0 && <AdsUnit slot="4694567949" />}
          </Fragment>
        ))}
      </div>
      <div className="mt-8 md:mt-12 lg:mt-16 flex justify-center">
        <LoadMoreWheels
          searchtitle={searchtitle}
          initialStart={initialStart}
          total={wheelTotal}
        />
      </div>
    </div>
  );
}
