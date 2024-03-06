import express from "express";
import cors from "cors"
import passport from "passport";
import routes from "./routes/index";
import mongoose from "mongoose"
import "dotenv/config"

async function main() {
    const app = express()
    const PORT = process.env.PORT || 5000

    // set cors headers
    app.use(cors())

    // remove all json null response value
    app.set('json replacer', (k: any, v: any) => (v === null ? undefined : v))

    // parse request body
    app.use(express.urlencoded({ extended: true }))
    app.use(express.json())

    app.use(passport.initialize())

    app.use("", routes)

    try {
        app.listen(PORT, async () => {
            await mongoose.connect(process.env.MONGODB_CONNECTION_STRING!);
            console.log('Connection has been established successfully.');
            console.log(`API is listening on port ${PORT}`)
        })

    } catch (error) {
        console.error('Unable to established connection', error);
    }
}

main().catch(err => {
    console.log(err)
    process.exit(1)
});
