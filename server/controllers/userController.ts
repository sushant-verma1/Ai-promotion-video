import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";

export const getUsercredits = async (req: Request, res: Response) => {
  try {
    const { userId } = req.auth();
    if (!userId) {
      return res.status(401).json({ message: "unauthorized" });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    res.json({ credits: user?.credits });
  } catch (error: any) {
    res.status(500).json({ message: error.message || error.code });
  }
};

export const getAllProjects = async (req: Request, res: Response) => {
  try {
    const { userId } = req.auth();
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ message: error.message || error.code });
  }
};
export const getProjectById = async (req: Request, res: Response) => {
  try {
    const { userId } = req.auth();
    const projectId = Array.isArray(req.params.projectId)
      ? req.params.projectId[0]
      : req.params.projectId;

    const project = await prisma.project.findUnique({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(project);
  } catch (error: any) {
    res.status(500).json({ message: error.message || error.code });
  }
};

export const ToggleProjectPublic = async (req: Request, res: Response) => {
  try {
    const { userId } = req.auth();
    const projectId = Array.isArray(req.params.projectId)
      ? req.params.projectId[0]
      : req.params.projectId;

    const project = await prisma.project.findUnique({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!project?.generatedImage && !project?.generatedVideo) {
      return res
        .status(404)
        .json({ message: "Project has no generated content" });
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { isPublished: !project.isPublished },
    });
    res.json({ isPublished: !project.isPublished });
  } catch (error: any) {
    res.status(500).json({ message: error.message || error.code });
  }
};
