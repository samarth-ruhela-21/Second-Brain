import dotenv from "dotenv";
dotenv.config(); 

export const MONGO_URL = process.env.MONGO_URL;
export const jwt_secret = process.env.jwt_secret;
export const PORT = process.env.PORT || 3000;