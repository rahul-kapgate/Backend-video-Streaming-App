import { Router } from "express";
import { resgisterUser } from "../controllers/user.controllers.js";

const router = Router();

router.route("/register").post(resgisterUser)

export default router