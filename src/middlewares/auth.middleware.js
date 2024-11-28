import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken"
import { User } from '../models/user.model.js'
import { ApiResponse } from "../utils/ApiResponse";


export const verifyJWT = asyncHandler(async (req,res,next) => {

    try {

        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
        if(!token) throw new ApiError(401, " UnAuthorized request !! ")
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id).select(
          "-password -refreshToken"
        );
    
        //TODO: disscuss about Frontend 
        if(!user )  throw new ApiResponse(401, "Invalid Acces token")
    
        req.user;
        next()

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token catch ")
    }    
})