import { storeWheelDataToDatabase } from "@components/actions/actions";
import WheelData from "@data/WheelData";

// Function to simulate delay (in milliseconds)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const page = async () => {
  console.log("Wheel Data elements length = ", Object.keys(WheelData).length);
  const wheelDataEntries = Object.entries(WheelData);

  for (let i = 130; i < 138; i++) {
    console.log(wheelDataEntries[i][0] + " ...... processing ...... \n");

    await delay(1000); // Adjust delay time as needed
    const response = await storeWheelDataToDatabase({
      jsonKey: wheelDataEntries[i][0],
      jsonData: wheelDataEntries[i][1],
    });

    await delay(3000); // Adjust delay time as needed
  }
  return <div>Ohhh....</div>;
};

export default page;
