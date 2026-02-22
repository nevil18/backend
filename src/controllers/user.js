import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessRefreshToken = async function(userId) {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Token generation failed")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, fullname } = req.body
    // console.log("Username:", username)

    if( 
        [fullname, username, email, password].some(field => !field || field.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existUser = await User.findOne({ $or: [{ username }, { email }] })
    if(existUser) {
        throw new ApiError(409, "Username or email already exists")
    }

    // console.log(req.body);
    

    const avatarlocalpath = req.files?.avatar?.[0]?.path;
    // const coverimagelocalpath = req.files?.coverimage?.[0]?.path;

    let coverimagelocalpath = null;
    if (req.files?.coverimage?.[0]?.path) {
        coverimagelocalpath = req.files.coverimage[0].path;
    }

    // console.log(req.files);
    

    if(!avatarlocalpath) {
        throw new ApiError(400, "Avatar image is required")
    }

    const avatar = await uploadOnCloudinary(avatarlocalpath)
    let coverimage = null;
    if (coverimagelocalpath) {
        coverimage = await uploadOnCloudinary(coverimagelocalpath);
    }


    if(!avatar) {
        throw new ApiError(400, "Avatar file upload failed")
    }

    const user = await User.create({
        username: username.toLowerCase(),
        email,
        password,
        fullname,
        avatar: avatar.secure_url,
        coverimage: coverimage?.secure_url || ""
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser) {
        throw new ApiError(500, "User creation failed")
    }

    return res.status(201).json(new ApiResponse(201, "User registered successfully", createdUser))
})

const loginUser = asyncHandler(async (req, res) => {
    const {email,username,password} = req.body

    if(!username && !email)
    {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{email}, {username}]
    })

    if(!user) {
        throw new ApiError(404, "User not found")
    }

    const isPasswordValid = await user.comparePassword(password)

    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid password")
    }

    const {accessToken, refreshToken} = await generateAccessRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,accessToken,refreshToken
            },
            "user logged in successfully"   
        )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.
    status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200, null, "User logged out successfully"))
}) 

const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decoded = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decoded.userId);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or already used");
        }

        // ✅ Correct ID and variable names
        const { accessToken, refreshToken } =
            await generateAccessRefreshToken(user._id);

        const options = {
            httpOnly: true,
            secure: true  
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken },
                    "Access token refreshed successfully"
                )
            );

    } catch (error) {
        throw new ApiError(
            401,
            error?.message || "Invalid refresh token"
        );
    }
});

const changeCurrentPassword = asyncHandler(async(req,res) => {
    const {oldpassword,newpassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await User.comparePassword(oldpassword)

    if(!isPasswordCorrect) 
    {
        throw new ApiError(400,"invalid old password")
    }

    user.password = newpassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json(200, req.user, "current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullname,email} = req.body

    if(!fullname || !email){
        throw new ApiError(400,"All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res) => {
    const avatarlocalpath = req.file?.path

    if(!avatarlocalpath) {
        throw new ApiError(400,"avatar file is missing")
    }

    const avatar = await uploadOnCloudinary (avatarlocalpath)

    if(!avatar.url) {
        throw new ApiError(400,"error while uploading on avatar")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"avatar file is updated")
    )
})

const updateUsercoverImage = asyncHandler(async(req,res) => {
    const coverImagelocalpath = req.file?.path

    if(!coverImagelocalpath) {
        throw new ApiError(400,"coverimage file is missing")
    }

    const coverImage = await uploadOnCloudinary (coverImagelocalpath)

    if(!coverImage.url) {
        throw new ApiError(400,"error while uploading on avatar")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverimage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Cover image is updated")
    )
})







export { registerUser, loginUser , logoutUser , refreshAccessToken , changeCurrentPassword , getCurrentUser , updateAccountDetails}