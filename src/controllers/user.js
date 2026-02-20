import { asyncHandler } from "../utils/asyncHandler.js"
import { apiError } from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../config/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, fullname } = req.body
    // console.log("Username:", username)

    if( 
        [fullname, username, email, password].some(field => !field || field.trim() === "")
    ) {
        throw new apiError("All fields are required", 400)
    }

    const existUser = await User.findOne({ $or: [{ username }, { email }] })
    if(existUser) {
        throw new apiError("Username or email already exists", 409)
    }

    const avatarlocalpath = req.files?.avatar?.[0]?.path;
    const coverimagelocalpath = req.files?.coverimage?.[0]?.path;

    if(!avatarlocalpath) {
        throw new apiError("Avatar image is required", 400)
    }

    const avatar = await uploadOnCloudinary(avatarlocalpath)
    const coverimage = await uploadOnCloudinary(coverimagelocalpath)

    if(!avatar) {
        throw new apiError("avatar file is required", 400)
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
        throw new apiError("User creation failed", 500)
    }

    return res.status(201).json(new ApiResponse(200, "User registered successfully", createdUser))
})

export { registerUser }