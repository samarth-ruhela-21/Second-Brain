import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from 'jsonwebtoken';
import { jwt_secret } from "./config";

export const userMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization;

    // 1. Check if token exists
    if (!token) {
        res.status(403).json({ message: "Unauthorized: No token provided" });
        return; // STOP execution here
    }

    try {
        // 2. Verify inside a try-catch block
        const decoded = jwt.verify(token, jwt_secret as string) as JwtPayload;

        // 3. Check for existence of .id
        if (decoded && decoded.id) {
            req.userId = decoded.id;
            next();
        } else {
            res.status(403).json({ message: "Unauthorized: Invalid token structure" });
        }

    } catch (error) {
        // 4. Handle invalid/expired tokens gracefully
        res.status(403).json({ message: "Unauthorized: Invalid token" });
    }
}