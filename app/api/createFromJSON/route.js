import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import Page from "@models/page";
import { NextResponse } from "next/server";
import {
  ensureArrayOfObjects,
  replaceUnderscoreWithDash,
} from "@utils/HelperFunctions";

import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure to set your API key in environment variables
});

// Utility function for delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

//sending request to create a list
export async function POST(req) {
  try {
    const { jsonKey, jsonData } = await req.json(); // Extract the JSON data from the request body

    console.log("JsonKey = ", jsonKey);
    console.log("jsonData = ", jsonData);

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
    const prompt = wheelData.title;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `only give 4 color codes for "${prompt}" each separated by comma`,
        },
      ],
      max_tokens: 200,
    });

    const colorCodes = response.choices[0].message.content
      .split(",")
      .map((word) => word.trim())
      .slice(0, 4); // Ensure we only take 4 words

    console.log("Words = \n", colorCodes);

    await delay(1500);
    const dataObjectForSegments = ensureArrayOfObjects(wheelData.segments);

    const wheel = new Wheel({
      title: wheelData.title,
      description: wheelData.description,
      data: dataObjectForSegments || [], // Handle content if present
      wheelData: {
        segColors: colorCodes,
        spinDuration: 5,
        maxNumberOfOptions: 100,
        innerRadius: 15,
        removeWinnerAfterSpin: false,
        customPopupDisplayMessage: "The Winner is...",
      },
      relatedTo: {type: wheelData.relatedTo.type , id: wheelData.relatedTo.id},
      createdBy: "gauravsingh9314@gmail.com", // Assuming admin for simplicity
      tags: wheelData.tags || "",
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
