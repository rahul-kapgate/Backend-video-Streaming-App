import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError} from '../utils/ApiError.js'
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
 

const generateAccessTokenAndRefreshToken =  async (userId) => {

  try {
    
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refereshToken = user.generateRefreshToken()

    user.refreshToken = refereshToken
    user.save({validateBeforeSave : false})

    return { accessToken, refereshToken };

  } catch (error) {
    throw new ApiError(500, "Error while Generating  access and refresh Tokens")
  }

}

const resgisterUser = asyncHandler( async (req,res) => {
 
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

  const { fullname , username, password, email } = req.body;
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
    $or : [ { username } , { email } ]
})

if(existedUser){
    throw new ApiError(409, "Username with username or email already existed !! ")
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

if(!avatar) throw new ApiError(400, "Avatar file is required");

 const user = await User.create({
    fullname,
    avatar : avatar.url,
    coverImage : coverImage?.url || "",
    email,
    password,
    username : username.toLowerCase(),
})

const createdUser = await User.findById(user._id).select(
  "-password -refreshToken"
);

if(!createdUser) throw new ApiError(500, "Error while registing user")

// return res.status(201).json({createdUser})

return res.status(201).json(
    new ApiResponse(200, createdUser, "user register successfully ")
)

//end 
})


const loginUser = asyncHandler( async (req,res) => {
  // req body -> data
  // username or email
  //find the user
  //password check
  //access and referesh token
  //send cookie

  const {username, email, password} = req.body

  if(!username || !email){
    throw new ApiError(404, "username or email is required")
  }

  const user = await User.findOne({
    $or : [{ username }, { email }]
  })

  if(!user) throw new ApiError(400, "User Not found")

  const isPasswordValid = await user.isPasswordCorrect(password)
  
 if (!isPasswordValid) throw new ApiError(401, "password is incorrect ");


 const { accessToken, refereshToken } = generateAccessTokenAndRefreshToken(user._id)

 const loggedinUser = await User.findById(user._id).select(
   "-password , refreshToken"
 );

 const options = {
httpOnly : true,
secure : true ,
 }


 return res
 .status(200)
 .cookie("accessToken" , accessToken, options)
 .cookie("refreshToken", refereshToken, options)
 .json(
  new ApiResponse(
    200,
    {
      user : loggedinUser, accessToken,refreshtoken,

    },
    "User Logged in Successfully !!"
  )
 )



  //end
})

const logoutUser = asyncHandler( async (req,res) => {

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set : {
        refreshToken : undefined
      }
    },
    {
      new : true
    }
  )

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

export { resgisterUser , loginUser , logoutUser }