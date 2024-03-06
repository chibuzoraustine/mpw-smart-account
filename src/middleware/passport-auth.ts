import passport from "passport";
import { ExtractJwt, JwtFromRequestFunction, Strategy } from "passport-jwt";
import userModel from "../models/userModel";
import "dotenv/config"

type Opts = {
    jwtFromRequest: JwtFromRequestFunction,
    secretOrKey: string
}

const opts: Opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.APP_SECRET!
}

passport.use(new Strategy(opts, async (payload, done) => {
    try {
        const user = await userModel.findOne({_id: payload.id})
        if (user) {
            return done(null, {
                id: user._id,
                email: user.email
            });
        } else {
            return done(null, false);
        }
    } catch (err) {
        return done(err, false);
    }
}))

export default passport