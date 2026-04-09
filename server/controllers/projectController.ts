import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { v2 as cloudinary } from "cloudinary";
import {
  GenerateContentConfig,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/genai";
import fs from "fs";
import ai from "../config/ai.js";
import axios from "axios";
import path from "path";

const loadImage = (path: string, mimeType: string) => {
  return {
    inlineData: {
      data: fs.readFileSync(path).toString("base64"),
      mimeType,
    },
  };
};

export const createProject = async (req: Request, res: Response) => {
  let tempProjectId: string;
  const { userId } = req.auth();
  let isCreditDeducted = false;

  const {
    name = "new project",
    aspectRatio,
    userPrompt,
    productName,
    productDescription,
    targetLength = 5,
  } = req.body;

  const images: any = req.files;

  if (images.length < 2 || !productName) {
    return res
      .status(400)
      .json({ message: "At least 2 images and product name are required" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.credits < 5) {
    return res.status(401).json({ message: "Not enough credits" });
  } else {
    await prisma.user
      .update({
        where: { id: userId },
        data: { credits: { decrement: 5 } },
      })
      .then(() => {
        isCreditDeducted = true;
      });
  }
  try {
    let uploadedImages = await Promise.all(
      images.map(async (item: any) => {
        let result = await cloudinary.uploader.upload(item.path, {
          resource_type: "image",
        });
        return result.secure_url;
      }),
    );

    const project = await prisma.project.create({
      data: {
        name,
        userId,
        productName,
        productDescription,
        targetLength: parseInt(targetLength),
        aspectRatio,
        userPrompt,
        uploadedImages,
        isGenerating: true,
      },
    });

    tempProjectId = project.id;
    const model = "gemini-3.1-flash-image-preview";
    const generationConfig: GenerateContentConfig = {
      maxOutputTokens: 32768,
      temperature: 1,
      topP: 0.95,
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: aspectRatio || "9:16",
        imageSize: "1k",
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.OFF,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.OFF,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.OFF,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.OFF,
        },
      ],
    };

    const img1base64 = loadImage(images[0].path, images[0].mimetype);
    const img2base64 = loadImage(images[1].path, images[1].mimetype);

    const prompt = {
      text: `combine the person and product intoo realistic photo.
      make the person naturally hold or use the product.
      march scale, lighting, shadow and perspective.
      make the person stand in studio professional lighting.
      output e-commerce quality photo realistic imagery.${userPrompt}`,
    };

    const response: any = await ai.models.generateContent({
      model,
      contents: [img1base64, img2base64, prompt],
      config: generationConfig,
    });

    if (!response?.candidates?.[0]?.content?.parts) {
      throw new Error("unexpected response");
    }

    const parts = response.candidates[0].content.parts;

    let finalBuffer: Buffer | null = null;

    for (const part of parts) {
      if (part.inlineData) {
        finalBuffer = Buffer.from(part.inlineData.data, "base64");
      }
    }

    if (!finalBuffer) {
      throw new Error("no image generated");
    }

    const base64Image = `data:image/png;base64;${finalBuffer.toString("base64")}`;

    const uploadResult = await cloudinary.uploader.upload(base64Image, {
      resource_type: "image",
    });

    await prisma.project.update({
      where: { id: project.id },
      data: {
        generatedImage: uploadResult.secure_url,
        isGenerating: false,
      },
    });

    res.json({ projectId: project.id });
  } catch (error: any) {
    if (tempProjectId!) {
      await prisma.project.update({
        where: { id: tempProjectId },
        data: { isGenerating: false, error: error.message },
      });
    }

    if (isCreditDeducted) {
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: 5 } },
      });
    }

    res.status(500).json({ message: error.message });
  }
};
export const createVideo = async (req: Request, res: Response) => {
  const { userId } = req.auth();
  const { projectId } = req.body;
  let isCreditDeducted = false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.credits < 10) {
    return res.status(401).json({ message: "insufficient credits" });
  }

  await prisma.user
    .update({
      where: { id: userId },
      data: { credits: { decrement: 10 } },
    })
    .then(() => {
      isCreditDeducted = true;
    });

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId, userId },
      include: { user: true },
    });
    if (!project || project.isGenerating) {
      return res.status(404).json({ message: "generation in progress" });
    }
    if (project.generatedVideo) {
      return res.status(404).json({ message: "video alredy created" });
    }
    await prisma.project.update({
      where: { id: projectId },
      data: { isGenerating: true },
    });

    const prompt = `make the person showcase the product which is ${project.productName} ${project.productDescription && `and product desciption:${project.productDescription}`}`;

    const model = "veo-3.1-generate-preview";

    if (!project.generatedImage) {
      throw new Error("generated image not found");
    }

    const image = await axios.get(project.generatedImage, {
      responseType: "arraybuffer",
    });

    const imageBytes: any = Buffer.from(image.data);

    let operation: any = await ai.models.generateVideos({
      model,
      prompt,
      image: {
        imageBytes: imageBytes.toString("base64"),
        mimeType: "image/png",
      },
      config: {
        aspectRatio: project.aspectRatio || "9:16",
        numberOfVideos: 1,
        resolution: "720p",
      },
    });

    while (!operation.done) {
      console.log("waiting for video generation to complete ...");
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({
        operation: operation,
      });
    }
    const filename = `${userId}-${Date.now()}.mp4`;
    const filePath = path.join("videos", filename);

    fs.mkdirSync("videos", { recursive: true });

    if (!operation.response.generatedVideos) {
      throw new Error(operation.response.raiMediaFilteredReasons[0]);
    }
    await ai.files.download({
      file: operation.response.generatedVideos[0].video,
      downloadPath: filePath,
    });

    const uploadResult = await cloudinary.uploader.upload(filePath, {
      resource_type: "video",
    });

    await prisma.project.update({
      where: { id: project.id },
      data: { generatedVideo: uploadResult.secure_url, isGenerating: false },
    });
    fs.unlinkSync(filePath);

    res.json({
      message: "video generation completed",
      videoUrl: uploadResult.secure_url,
    });
  } catch (error: any) {
    await prisma.project.update({
      where: { id: projectId, userId },
      data: { isGenerating: false, error: error.message },
    });

    if (isCreditDeducted) {
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: 10 }},
      });
    }
    res.status(500).json({ message: error.message });
  }
};
export const getAllPublishedProjects = async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      where: {isPublished: true}
    })
    res.json({projects})
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
export const deleteProject = async (req: Request, res: Response) => {
  try {
    const {userId} = req.auth()
    const {projectId} = req.params as {projectId: string}

    const project = await prisma.project.findUnique({
      where: {id: projectId, userId}
    })
    if(!project){
      return res.status(404).json({message: "project nor found"})
    }
    await prisma.project.delete({
      where: {id: projectId}
    })
    res.json({message: 'Project got deleted'})

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
