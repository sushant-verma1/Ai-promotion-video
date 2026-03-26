import express from "express";
import {
  getAllProjects,
  getProjectById,
  getUsercredits,
  ToggleProjectPublic,
} from "../controllers/userController.js";
import { protect } from "../middlewares/auth.js";

const userRouter = express.Router();

userRouter.get("/credits", protect, getUsercredits);
userRouter.get("/projects", protect, getAllProjects);
userRouter.get("/projects/:projectId", protect, getProjectById);
userRouter.get("/publish/:projectId", protect, ToggleProjectPublic);

export default userRouter
