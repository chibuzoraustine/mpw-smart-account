import express from  'express'
import userRoutes from "./user"
import walletRoutes from "./wallet"
import authRoutes from "./auth"
import only_auth_user from '../middleware/only_auth_user';

const router = express.Router();

router.use("/auth", authRoutes)
router.use("/user", only_auth_user, userRoutes)
router.use("/wallets", only_auth_user, walletRoutes)

export default router;