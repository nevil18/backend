import mongoose, {Schema} from "mongoose";
import bycrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true, 
        lowercase: true,
        index: true
    },
    username: { 
        type: String, 
        required: true, 
        unique: true, 
        trim: true, 
        lowercase: true
    },
    fullname: { 
        type: String, 
        required: true,
        trim: true, 
        index: true
    },
    avatar: { 
        type: String, 
        required: true,
    },
    coverimage: { 
        type: String, 
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password: { 
        type: String, 
        required: true,
    },
    refreshToken: {
        type: String,
    }
},{ timestamps: true})

userSchema.pre("save", async function(next) {
    if (!this.isModified("password")) {
        return next();
    }
    this.password = await bycrypt.hash(this.password, 10);
    next();
})

userSchema.methods.comparePassword = async function(password) {
    return await bycrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        { userId: this._id },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
}

userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        { userId: this._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
}

const User = mongoose.model("User", userSchema);

export { User }