import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // Check if file exists before uploading
        if (!fs.existsSync(localFilePath)) {
            console.log("File does not exist:", localFilePath);
            return null;
        }

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

        // console.log("Uploaded:", localFilePath);

        // ❌ DO NOT DELETE FILE FOR NOW
        fs.unlinkSync(localFilePath);

        return response;

    } catch (error) {
        console.error("Cloudinary error:", error.message);
        return null;
    }
};

export { uploadOnCloudinary };
