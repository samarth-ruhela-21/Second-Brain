"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("./config");
const zod_1 = require("zod");
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("./db");
const middleware_1 = require("./middleware");
const utils_1 = require("./utils");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
const signupSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(10),
    password: zod_1.z.string()
        .min(8)
        .max(20)
        .refine((password) => /[0-9]/.test(password))
        .refine((password) => /[!@#$%^&*]/.test(password))
        .refine((password) => /[A-Z]/.test(password))
        .refine((password) => /[a-z]/.test(password))
});
app.post('/api/v1/signup', function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const username = req.body.username;
        const password = req.body.password;
        const parsedData = signupSchema.safeParse(req.body);
        if (!parsedData.success) {
            return res.status(411).json({
                msg: "incorrect format",
                error: parsedData.error
            });
        }
        const userExist = yield db_1.UserModel.findOne({ username: username });
        if (userExist) {
            return res.status(403).json({ msg: "user already exist" });
        }
        try {
            const hashedPassword = yield bcrypt_1.default.hash(password, 5);
            yield db_1.UserModel.create({
                username: username,
                password: hashedPassword
            });
            res.status(200).json({ msg: "you are signed up" });
        }
        catch (e) {
            res.status(500).json({
                msg: "error creating user"
            });
        }
    });
});
app.post('/api/v1/signin', function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const username = req.body.username;
        const password = req.body.password;
        const existingUser = yield db_1.UserModel.findOne({
            username: username
        });
        if (!existingUser || !existingUser.password) {
            return res.status(403).json({
                msg: 'user does not exist'
            });
        }
        const passwordMatch = yield bcrypt_1.default.compare(password, existingUser.password);
        if (passwordMatch) {
            const token = jsonwebtoken_1.default.sign({
                id: existingUser._id.toString()
            }, config_1.jwt_secret);
            res.json({
                token
            });
        }
        else {
            res.status(403).json({ message: "Incorrect credentials" });
        }
    });
});
app.post('/api/v1/content', middleware_1.userMiddleware, function (req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const link = req.body.link;
        const title = req.body.title;
        const type = req.body.type;
        try {
            yield db_1.ContentModel.create({
                link,
                title,
                type,
                tags: [],
                userId: req.userId,
            });
            res.json({
                message: "Content added"
            });
        }
        catch (e) {
            // THIS IS IMPORTANT: It logs the specific error to your terminal
            console.log("Error details:", e);
            res.status(500).json({ message: "Error while adding content" });
        }
    });
});
app.get('/api/v1/content', middleware_1.userMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    const content = yield db_1.ContentModel.find({
        userId: userId
    }).populate("userId", "username");
    res.json({
        content
    });
}));
app.delete('/api/v1/content', middleware_1.userMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const contentId = req.body.contentId;
    yield db_1.ContentModel.deleteMany({
        contentId,
        userId: req.userId
    });
    res.json({
        message: "Deleted"
    });
}));
app.post("/api/v1/brain/share", middleware_1.userMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { share } = req.body;
    if (share) {
        // Check if a link already exists for the user.
        const existingLink = yield db_1.LinkModel.findOne({ userId: req.userId });
        if (existingLink) {
            res.json({ hash: existingLink.hash }); // Send existing hash if found.
            return;
        }
        // Generate a new hash for the shareable link.
        const hash = (0, utils_1.random)(10);
        yield db_1.LinkModel.create({ userId: req.userId, hash });
        res.json({ hash }); // Send new hash in the response.
    }
    else {
        // Remove the shareable link if share is false.
        yield db_1.LinkModel.deleteOne({ userId: req.userId });
        res.json({ message: "Removed link" }); // Send success response.
    }
}));
// Route 7: Get Shared Content
app.get("/api/v1/brain/:shareLink", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const hash = req.params.shareLink;
    // Find the link using the provided hash.
    const link = yield db_1.LinkModel.findOne({ hash });
    if (!link) {
        res.status(404).json({ message: "Invalid share link" }); // Send error if not found.
        return;
    }
    // Fetch content and user details for the shareable link.
    const content = yield db_1.ContentModel.find({ userId: link.userId });
    const user = yield db_1.UserModel.findOne({ _id: link.userId });
    if (!user) {
        res.status(404).json({ message: "User not found" }); // Handle missing user case.
        return;
    }
    res.json({
        username: user.username,
        content
    }); // Send user and content details in response.
}));
app.listen(3000);
