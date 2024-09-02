import UserDashboard from "@components/UserDashboard";

export const metadata = {
  title: "User Dashboard",
  description:
    "Explore all your wheels and Take actions like Edit, Delete or Create New Wheels",
};

const page = () => {
  return <UserDashboard />;
};

export default page;
