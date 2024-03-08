import express from 'express'
import {
    getWallets,
    createUserWallet,
    createDynamicWallet,
    addUserWalletCosigner,
    deleteUserWalletCosigner,
    walletTransfer,
    walletTransferBatch,
    settleDynamicWallet
} from '../controllers/walletController';

const router = express.Router();

router.get("", getWallets);
router.post("/user", createUserWallet);
router.post("/user/add_cosigner", addUserWalletCosigner);
router.post("/user/delete_cosigner", deleteUserWalletCosigner);
router.post("/transfer", walletTransfer);
router.post("/transfer/batch", walletTransferBatch);
router.post("/dynamic", createDynamicWallet);
router.post("/dynamic/settle", settleDynamicWallet);

export default router