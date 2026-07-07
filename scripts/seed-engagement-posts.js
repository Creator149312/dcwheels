import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/user.js";
import Post from "../models/post.js";
import TopicPage from "../models/topicpage.js";
import { connectMongoDB } from "../lib/mongodb.js";

const USERS_TO_SEED = [
    { email: "mysticlotusin@example.in", password: "RiverFlow!92", name: "Mystic Lotus" },
    { email: "ironbritknight@example.uk", password: "TowerGuard#47", name: "Iron Brit Knight" },
    { email: "libertyeagleusa@example.us", password: "FreedomRing@73", name: "Liberty Eagle USA" }
];

const MOVIE_SLUGS = [
    "1705729-man-of-war",
    "1084242-zootopia-2",
    "911430-f1"
];

const POSTS = {
    "1705729-man-of-war": [
        {
            userIndex: 0,
            content: "The gritty look of Man of War is something else. Does anyone know where they shot the coastal scenes? The background research into those naval environments really paid off.",
            hasPoll: false
        },
        {
            userIndex: 1,
            content: "Solid action, but how do we feel about the box office performance so far? I'm wondering if the opening revenue is meeting expectations for this kind of military drama.",
            hasPoll: true,
            pollOptions: ["Exceeding expectations", "Doing okay", "Underperforming", "Wait for digital"]
        }
    ],
    "1084242-zootopia-2": [
        {
            userIndex: 2,
            content: "Can't wait to head back to Zootopia! Given the social themes of the first one, do you think they'll tackle more modern tech/social media influence in this sequel?",
            hasPoll: true,
            pollOptions: ["Definitely", "Maybe a little", "Keep it simple", "Focus on new mammals"]
        },
        {
            userIndex: 0,
            content: "Did you know the animation team had to develop a new hair engine just for the different fur textures in the first movie? I can't imagine how much more detailed the sequel will look.",
            hasPoll: false
        }
    ],
    "911430-f1": [
        {
            userIndex: 1,
            content: "Apparently they used actual F1 drivers to consult on the racing sequences to keep things as authentic as possible. Which part of the masterfully choreographed races caught your attention most?",
            hasPoll: true,
            pollOptions: ["The pit stop speed", "Overnight rain sequence", "The final lap overtake", "Engine sound design"]
        },
        {
            userIndex: 2,
            content: "Just read something about the production budget for the track permissions alone—it was astronomical. Do you think the realism was worth that price tag?",
            hasPoll: false
        }
    ]
};

async function seedPosts() {
    try {
        await connectMongoDB();
        console.log("Connected to MongoDB.");

        const userCache = [];
        for (const userData of USERS_TO_SEED) {
            let user = await User.findOne({ email: userData.email });
            if (!user) {
                throw new Error(`User ${userData.email} not found in database! Please ensure they are registered.`);
            }
            console.log(`Found user: ${user.email} (${user.username})`);
            userCache.push(user);
        }

        for (const slug of MOVIE_SLUGS) {
            const topicPage = await TopicPage.findOne({ slug });
            if (!topicPage) {
                console.error(`Topic page not found for slug: ${slug}. Make sure it has been visited/created first.`);
                continue;
            }

            console.log(`Seeding posts for ${topicPage.title.default || slug}...`);
            const postsToSeed = POSTS[slug];

            for (const p of postsToSeed) {
                const user = userCache[p.userIndex];
                
                // Spread posts across the last 7 days to look organic
                const daysAgo = Math.floor(Math.random() * 7);
                const hoursAgo = Math.floor(Math.random() * 24);
                const postDate = new Date();
                postDate.setDate(postDate.getDate() - daysAgo);
                postDate.setHours(postDate.getHours() - hoursAgo);

                const newPost = new Post({
                    userId: user._id,
                    authorName: user.name,
                    authorHandle: user.username || user.email.split('@')[0],
                    authorImage: null,
                    content: p.content,
                    contentRef: {
                        type: "movie",
                        externalId: String(topicPage.relatedId),
                        slug: topicPage.slug,
                        title: topicPage.title.default || topicPage.title.localized || "",
                        image: topicPage.cover
                    },
                    hasPoll: p.hasPoll,
                    pollOptions: p.hasPoll ? p.pollOptions.map(text => ({ text, voteCount: Math.floor(Math.random() * 50) })) : [],
                    createdAt: postDate,
                    updatedAt: postDate
                });

                await newPost.save();
                console.log(`- Post added by ${user.name} (Simulated: ${postDate.toLocaleDateString()})`);
            }
        }

        console.log("Seeding complete!");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding posts:", error);
        process.exit(1);
    }
}

seedPosts();
