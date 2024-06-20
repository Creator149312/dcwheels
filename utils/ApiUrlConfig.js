import configDev from "./config.dev";
import configProd from "./config.prod";
import configGit from "./config.github";

let apiConfig;

if (process.env.WORK_ENV === "production") {
  apiConfig = configProd;
} else if (process.env.WORK_ENV === "github") {
  apiConfig = configGit;
} else {
  apiConfig = configDev;
}

console.log("Api Config : ", apiConfig);

export default apiConfig;
