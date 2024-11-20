import express from "express";
import mongoose from "mongoose";
import connectDB from "./db/index.js";
import dotenv from 'dotenv';
dotenv.config({
    path : './.env'
})

const app = express();

connectDB()
.then( () => {
    app.listen(process.env.PORT || 8000 , ()=>{
        console.log(`⚙️. Server is running at Port ${process.env.PORT}`);
    })
})
.catch( (errer) => {
    console.log("Database Connection Failed ",errer)
})