"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("./config");
const userMiddleware = (req, res, next) => {
    const token = req.headers.authorization;
    // 1. Check if token exists
    if (!token) {
        res.status(403).json({ message: "Unauthorized: No token provided" });
        return; // STOP execution here
    }
    try {
        // 2. Verify inside a try-catch block
        const decoded = jsonwebtoken_1.default.verify(token, config_1.jwt_secret);
        // 3. Check for existence of .id
        if (decoded && decoded.id) {
            req.userId = decoded.id;
            next();
        }
        else {
            res.status(403).json({ message: "Unauthorized: Invalid token structure" });
        }
    }
    catch (error) {
        // 4. Handle invalid/expired tokens gracefully
        res.status(403).json({ message: "Unauthorized: Invalid token" });
    }
};
exports.userMiddleware = userMiddleware;
