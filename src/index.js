import connetDB from "./db/index.js" 
import dotenv from "dotenv"

dotenv.config();

connetDB()
.then(
    () => {
        app.listen(process.env.PORT || 8000 ,() => {
            console.log(`Server is running on port ${process.env.PORT || 8000}`);
        })
    }
)
.catch(
    (err) => {
        console.log("Mongodb not connected ",err);
    }
)