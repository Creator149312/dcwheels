// app/data/getData.server.js
import { readFile } from "fs/promises";
import path from "path";

export async function getData(pageName) {
  const filePath = path.join(process.cwd(), "/data/data.json");
  const fileContents = await readFile(filePath, "utf-8");
  const data = JSON.parse(fileContents);
  const desiredKey = pageName;
  return data[desiredKey];
}
