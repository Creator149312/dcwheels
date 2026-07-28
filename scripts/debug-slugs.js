import mongoose from "mongoose";
import dotenv from "dotenv";
import TopicPage from "../models/topicpage.js";

dotenv.config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const pages = await TopicPage.find({ type: "anime" }, "slug type title");
        console.log("Found TopicPages:");
        console.log(JSON.stringify(pages, null, 2));
        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

check();
