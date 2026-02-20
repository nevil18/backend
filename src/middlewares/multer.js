import multer from "multer";

// Configure storage settings
const storage = multer.diskStorage({

    // Where to store uploaded file
    destination: function (req, file, cb) {
        cb(null, "./public/temp");
    },

    // What should be the file name
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

// Create multer upload middleware
export const upload = multer({
    storage: storage,
});
