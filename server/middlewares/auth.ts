import { NextFunction, Request, Response } from "express";

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId } = req.auth();
    if (!userId) {
      res.status(401).json({ message: "unauthorized" });
    }
    next();
  } catch (error: any) {
    res.status(401).json({ message: error.code || error.message });
  }
};
