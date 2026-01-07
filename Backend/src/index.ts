import express from 'express'
import jwt from 'jsonwebtoken'
import { jwt_secret } from './config';
import {z} from 'zod';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import {ContentModel, UserModel, LinkModel} from './db'
import { userMiddleware } from './middleware';
import { random } from "./utils";
import cors from "cors";



const app = express();
app.use(express.json());
app.use(cors());

interface User{
    username : string;
    password : string
}


const signupSchema = z.object({
        username : z.string().min(3).max(10),
        password : z.string()
        .min(8)
        .max(20)
        .refine((password) => /[0-9]/.test(password))
        .refine((password) => /[!@#$%^&*]/.test(password))
        .refine((password) => /[A-Z]/.test(password))
        .refine((password) => /[a-z]/.test(password))
    })


app.post('/api/v1/signup', async function(req, res){
    const username = req.body.username;
    const password = req.body.password;

    const parsedData = signupSchema.safeParse(req.body);

    if(!parsedData.success){
        return res.status(411).json({
            msg : "incorrect format",
            error : parsedData.error            
        })
    }

    const userExist = await UserModel.findOne({username : username})
    if(userExist){
        return res.status(403).json({msg : "user already exist"})
    }

    try{
        const hashedPassword = await bcrypt.hash(password, 5);

        await UserModel.create({
            username : username, 
            password : hashedPassword
        });

        res.status(200).json({msg : "you are signed up"})
    } catch(e){
        res.status(500).json({
            msg: "error creating user"
        })
    }
})

app.post('/api/v1/signin', async function(req, res){
    const username = req.body.username;
    const password = req.body.password;

    const existingUser = await UserModel.findOne({
        username: username
    })

    if(!existingUser || !existingUser.password){
        return res.status(403).json({
            msg : 'user does not exist'
        })
    }
    const passwordMatch = await bcrypt.compare(password, existingUser.password)

    if(passwordMatch){
        const token = jwt.sign({
            id : existingUser._id.toString()
        }, jwt_secret as string)
        res.json({
            token
        })
    }else{
         res.status(403).json({ message: "Incorrect credentials" });
    }
})

app.post('/api/v1/content', userMiddleware, async function(req, res){
    const link = req.body.link;
    const title = req.body.title;
    const type = req.body.type;
    try{
        await ContentModel.create({
        link,
        title,
        type,
        tags :[],
        userId : req.userId,
        })
        res.json({
            message : "Content added"
        })
    }
    catch (e) {
        // THIS IS IMPORTANT: It logs the specific error to your terminal
        console.log("Error details:", e); 
        res.status(500).json({ message: "Error while adding content" });
    }
});

app.get('/api/v1/content', userMiddleware, async (req, res)=>{
    const userId = req.userId;
    const content = await ContentModel.find({
        userId : userId
    }).populate("userId", "username")
    res.json({
        content
    })
})

app.delete('/api/v1/content', userMiddleware, async (req, res)=>{
    const contentId = req.body.contentId;

    await ContentModel.deleteMany({
        contentId,
        userId : req.userId
    })
    res.json({
        message: "Deleted"
    })
})

app.post("/api/v1/brain/share", userMiddleware, async (req, res) => {
    const { share } = req.body;
    if (share) {
        // Check if a link already exists for the user.
        const existingLink = await LinkModel.findOne({ userId: req.userId });
        if (existingLink) {
            res.json({ hash: existingLink.hash }); // Send existing hash if found.
            return;
        }

        // Generate a new hash for the shareable link.
        const hash = random(10);
        await LinkModel.create({ userId: req.userId, hash });
        res.json({ hash }); // Send new hash in the response.
    } else {
        // Remove the shareable link if share is false.
        await LinkModel.deleteOne({ userId: req.userId });
        res.json({ message: "Removed link" }); // Send success response.
    }
});

// Route 7: Get Shared Content
app.get("/api/v1/brain/:shareLink", async (req, res) => {
    const hash = req.params.shareLink;

    // Find the link using the provided hash.
    const link = await LinkModel.findOne({ hash });
    if (!link) {
        res.status(404).json({ message: "Invalid share link" }); // Send error if not found.
        return;
    }

    // Fetch content and user details for the shareable link.
    const content = await ContentModel.find({ userId: link.userId });
    const user = await UserModel.findOne({ _id: link.userId });

    if (!user) {
        res.status(404).json({ message: "User not found" }); // Handle missing user case.
        return;
    }

    res.json({
        username: user.username,
        content
    }); // Send user and content details in response.
});


app.listen(3000);
