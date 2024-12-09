import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'


const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

     user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating referesh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //steps for user Registion

  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res

  const { fullname, username, password, email } = req.body;
  //   console.log(name);

  if (fullname === "") throw new ApiError(400, "fullname is required");
  else if (username === "") throw new ApiError(400, "username is required");
  else if (password === "") throw new ApiError(400, "password is required");
  else if (email === "") throw new ApiError(400, "email is required");

  // if (
  //   [fullname, email, username, password].some((field) => field?.trim() === "")
  // ) {
  //   throw new ApiError(400, "All fields are required");
  // }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(
      409,
      "Username with username or email already existed !! "
    );
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) throw new ApiError(400, "Avatar file is required");

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) throw new ApiError(500, "Error while registing user");

  // return res.status(201).json({createdUser})

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user register successfully "));

  //end
});

const loginUser = asyncHandler( async (req,res) => {
  // req body -> data
  // username or email
  //find the user
  //password check
  //access and referesh token
  //send cookie

  const {username, email, password} = req.body

  if(!(username || email)){
    throw new ApiError(404, "username or email is required")
  }

  const user = await User.findOne({
    $or : [{ username }, { email }]
  })

  // console.log(user)

  if(!user) throw new ApiError(400, "User Not found")

  const isPasswordValid = await user.isPasswordCorrect(password)

  // console.log(isPasswordValid);  correct

 if (!isPasswordValid) throw new ApiError(401, "password is incorrect ");

 const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
   user._id
 );

//  const loggedinUser = await User.findById(user._id).select(
//    "-password , -refreshToken"   // error
//  );

const loggedInUser = await User.findById(user._id).select(
  "-password -refreshToken"
);

 const options = {
httpOnly : true,
secure : true ,
 }

 console.log("User Logged in Successfully");

 return res
   .status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
     new ApiResponse(
       200,
       {
         user: loggedInUser,
         accessToken,
         refreshToken,
       },
       "User Logged in Successfully !!"
     )
   );

  //end
})

const logoutUser = asyncHandler( async (req,res) => {

if (!req.user || !req.user._id) {
  return res.status(400).json(new ApiResponse(400, {}, "Invalid user"));
}

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken" , options)
    .json(
      new ApiResponse(
        200,
        {},
        "user logged out"
      )
    )

})

const refreshAccessToken = asyncHandler(async (req, res) => {

   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

   if(!incomingRefreshToken) throw new ApiError(401, " Invalid USerunauthorized request");

   try {
    const decodedToken = jwt.verify(
     incomingRefreshToken, 
     process.env.REFRESH_TOKEN_SECRET
   );
 
   const user = await User.findById(decodedToken?._id)
 
   if(!user) throw new ApiError(401, "Invalid Refresh Token")
 
     if(incomingRefreshToken !== user?.refreshToken){
       throw new ApiError(401, "refresh token is expried to used")
     }
 
     const options = {
       httpOnly : true,
       secure : true,
     }
 
     const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens
     (user._id);
 
     return res
     .status(200)
     .cookie("accessToken", accessToken, options)
     .cookie("refreshToken", newRefreshToken, options)
     .json(
       new ApiResponse(
         200,
         {accessToken, refreshToken : newRefreshToken},
         "Access Token refreshed",
       )
     )
   } catch (error) {
    throw new ApiError(401, error?.message || "Invalid reffresh Token")
   }
})

const changeCurrentPassword = asyncHandler( async (req,res) => {

  const { oldPassword, newPassword, confPassword } = req.body;

  /* const { oldPassword, newPassword, confPassword } = req.body;
   if(!(newPassword === confPassword) ){
     throw new ApiError(400, "Password not matched ")
   } */

  const user = await User.findById(req.body?._id)

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect) throw new ApiError(400, "Old password is Invalid ")

    user.password = newPassword
    await user.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(
      ApiError(200, {}, "Password Changed !!")
    )
})

const getCurrentUser = asyncHandler(async (req,res) => {

  return res
  .status(200)
  .json(
    ApiResponse(200, req.user, "user fetched successfully")
  )
})

const updateUserDetails = asyncHandler(async (req,res) => {

  const {fullname, email} = req.body

  if(!fullname || !email) {
    throw new ApiError(400, "All fileds Are requtied")
  }

  const user = await findByIdAndUpdate(

    req.user?._id,
    {
      $set : {
        // fullname : fullname,
        // email : email

        fullname,
        email
      }
    },
    {new: true}
  ).select("-password")


  return res
    .status(200)
    .json(ApiResponse(200, user, "Account details updated successfully"));

})

const updatedUserAvatar = asyncHandler( async (req, res) => {

  const avatarLocalPath = req.file?.path

  if(!avatarLocalPath){
    throw new ApiError(400 , "Avatar file is missing")
  }

  // TODO : Detele old images
  
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    
    if(!avatar.url){
        throw new ApiError(400, "Error while uploading Avatar file")
    }

    //database request
    const user = await User.findByIdAndUpdate(
       req.user?._id,
      {
        $set : {
          avatar : avatar.url
        }
      },
      {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(
      ApiResponse(
      200,
      user,
      "avatar image updated successfully !! "
      )
    )
  
})


const updatedUserCoverImage = asyncHandler( async (req, res) => {

  const coverImageLocalPath = req.file?.path

  if(!coverImageLocalPath){
    throw new ApiError(400, "Error cover image file is missing ")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!coverImage.url) {
    throw new ApiError(400, "Error while uploding ocover image ")
  }

  //BD 
  const user = await User.findByIdAndUpdate(

      req.user?._id,
    {
      $set : {
        coverImage : coverImage.url
      }
    },
    {new : true}
  ).select("-password")

  return  res
  .status(200)
  .json(
    ApiResponse(
      200, 
      user,
      "cover Image Updated Succesfully "
    )
  )
})

const getUserChannelProfile = asyncHandler( async (req,res) => {

  const { username } = req.params

  if(!username?.trim()){
    throw new ApiError(400, "User is missing while getting user")
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },

    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },

    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },

    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },

    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },

  ]);

  if(!channel?.length){
    throw new ApiError(404, "channel does not Exists")
  }


  return res.status(200)
  .json(
    new ApiResponse(200, channel[0], "user channel fetched Successfully")
  )

})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserDetails,
  updatedUserAvatar,
  updatedUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};