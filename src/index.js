import express from "express";
import mongoose from "mongoose";
import connectDB from "./db/index.js";
import dotenv from 'dotenv';
dotenv.config({
    path : './.env'
})
import { app } from "./app.js";

connectDB()
.then( () => {
    app.listen(process.env.PORT || 8000 , ()=>{
        console.log(`⚙️. Server is running at Port ${process.env.PORT || 8000}`);
    })
})
.catch( (errer) => {
    console.log("Database Connection Failed ",errer)
})