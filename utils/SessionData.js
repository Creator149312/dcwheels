import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";

export const sessionData = async () => {
    const data = await getServerSession(authOptions);
    return data;
};