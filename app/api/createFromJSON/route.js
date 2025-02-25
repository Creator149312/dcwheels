import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import Page from "@models/page";
import { NextResponse } from "next/server";
import {
  ensureArrayOfObjects,
  replaceUnderscoreWithDash,
} from "@utils/HelperFunctions";

//sending request to create a list
export async function POST(req) {
  try {
    const { jsonKey, jsonData } = await req.json(); // Extract the JSON data from the request body

    // console.log("JsonKey = ", jsonKey);
    // console.log("jsonData = ", jsonData);

    // Validate the JSON data to ensure it has the necessary fields
    if (
      !jsonData ||
      !jsonData.title ||
      !jsonData.description ||
      !jsonData.segments
    ) {
      return res
        .status(400)
        .json({ message: "Invalid JSON format. Missing required fields." });
    }

    await connectMongoDB();

    // Step 1: Create the Wheel
    const wheelData = jsonData; // Directly use the JSON data received

    const dataObjectForSegments = ensureArrayOfObjects(wheelData.segments);

    const wheel = new Wheel({
      title: wheelData.title,
      description: wheelData.description,
      data: dataObjectForSegments || [], // Handle content if present
      createdBy: "gauravsingh9314@gmail.com", // Assuming admin for simplicity
      category: wheelData.category || "",
    });

    // Save the wheel to the database
    await wheel.save();

    const pageSlug = replaceUnderscoreWithDash(jsonKey);
    // Step 2: Create the Page
    const pageData = {
      title: `${wheel.title}`,
      description: `${wheelData.description}`,
      content: wheelData.content || [],
      slug: pageSlug.toLowerCase(),
      indexed: true,
      wheel: wheel._id, // Reference to the created wheel
    };

    const page = new Page(pageData);
    await page.save();

    // Return success message and the created wheel and page
    return NextResponse.json({
      message: "Page and Wheel Created Successfully",
    });
  } catch (error) {
    return NextResponse.json({ message: "Error Creating Page and Wheel" });
  }
}
