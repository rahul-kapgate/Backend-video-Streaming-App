import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'
import { ApiResponse } from '../utils/ApiResponse.js'


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
//    "-password , -refreshToken"
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
 
   const user = await findById(decodedToken?._id)
 
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
     .cookies("refreshToken", newRefreshToken, options)
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


export { registerUser, loginUser, logoutUser, refreshAccessToken };