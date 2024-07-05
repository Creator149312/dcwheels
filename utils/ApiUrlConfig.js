let apiConfig;

console.log("Work Env - ", process.env.WORK_ENV);

if (process.env.WORK_ENV === "production") {
  apiConfig = {
    apiUrl: "https://dcwheels.vercel.app/api", // Example production API URL
  };
} else if (process.env.WORK_ENV === "github") {
  apiConfig = {
    apiUrl: "https://ominous-engine-q766v6jx45r34qx9-3000.app.github.dev/api", // Example production API URL
  };
} else {
  apiConfig = {
    apiUrl: "http://localhost:3000/api", // Example local API URL
  };
}

console.log("Api Config : ", apiConfig);

export default apiConfig;
