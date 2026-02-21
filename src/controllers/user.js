import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

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

export { registerUser }