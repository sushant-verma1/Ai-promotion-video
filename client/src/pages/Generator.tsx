import React, { useState } from "react";
import Title from "../components/Title";
import UploadZone from "../components/UploadZone";
import {
  RectangleVerticalIcon,
  RectangleHorizontalIcon,
  Loader2Icon,
  Wand2Icon,
} from "lucide-react";
import { PrimaryButton } from "../components/Buttons";
import { useAuth, useUser } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../config/axios";

const Generator = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [name, setname] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productImage, setProductImage] = useState<File | null>(null);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [userPrompt, setUserPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "product" | "model",
  ) => {
    if (e.target.files && e.target.files[0]) {
      if (type === "product") {
        setProductImage(e.target.files[0]);
      } else {
        setModelImage(e.target.files[0]);
      }
    }
  };

  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      return toast("Please login to generate");
    }
    if (!productImage || !productName || !aspectRatio || !modelImage || name) {
      return toast("Please fill all the required fields");
    }
    try {
      setIsGenerating(true)
      const formData = new FormData()
      formData.append('name', name)
      formData.append('productName', productName)
      formData.append('productDescription', productDescription)
      formData.append('userPrompt', userPrompt)
      formData.append('aspectRatio', aspectRatio)
      formData.append('images', productImage)
      formData.append('images', modelImage)

      const token = await getToken()
      const {data} = await api.post('/api/project/create' , formData, {headers:{Authorization:`Bearer ${token}`}})

      toast.success(data.message)
      navigate('/result/' + data.projectId)

    } catch (error: any) {
      setIsGenerating(false)
      toast.error(error?.response?.data?.message || error.message)
    }
  };

  return (
    <div className="min-h-screen text-white p-6 md:p-12 mt-28">
      <form onSubmit={handleGenerate} className="max-w-4xl mx-auto mb-40">
        <Title
          heading="Create In-context images"
          description="upload your model and product images to generate stunning UGC, short form videos and social media post"
        />
        <div className="flex gap-20 max-sm:flex-col items-start justify-between">
          <div className="flex flex-col w-full sm:max-w-60 gap-8 mt-8 mb-12">
            <UploadZone
              label="Product image"
              file={productImage}
              onChange={(e) => {
                handleFileChange(e, "product");
              }}
              onClear={() => setProductImage(null)}
            />
            <UploadZone
              label="Model image"
              file={modelImage}
              onChange={(e) => {
                handleFileChange(e, "model");
              }}
              onClear={() => setModelImage(null)}
            />
          </div>
          {/* Right col */}
          <div className="w-full">
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm mb-4">
                Project name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setname(e.target.value)}
                placeholder="Name your project"
                className="w-full bg-white/3 border-2 p-4 rounded-lg text-sm border-violet-200/10
              focus:border-violet-500/50 outline-none transition-all"
              />
            </div>
            <div className="mb-4 text-gray-300">
              <label htmlFor="productName" className="block text-sm mb-4">
                Product name
              </label>
              <input
                type="text"
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Enter the name the product"
                className="w-full bg-white/3 border-2 p-4 rounded-lg text-sm border-violet-200/10
              focus:border-violet-500/50 outline-none transition-all"
              />
            </div>
            <div className="mb-4 text-gray-300">
              <label htmlFor="description" className="block text-sm mb-4">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Describe your product"
                className="w-full bg-white/3 rounded-lg border-2 p-4 border-violet-200/10 text-sm focus:border-violet-500/50 outline-none resize-none transition-all"
              />
            </div>
            <div className="mb-4 text-gray-300">
              <label className="block text-sm mb-4">Aspect ratio</label>
              <div className="flex gap-3">
                <RectangleVerticalIcon
                  onClick={() => setAspectRatio("9:16")}
                  className={`p-2.5 size-13 bg-white/6 rounded transition-all ring-2 ring-transparent cursor-pointer ${aspectRatio === "9:16" ? "ring-violet-500/50 bg-white/10" : ""}`}
                />
                <RectangleHorizontalIcon
                  onClick={() => setAspectRatio("16:9")}
                  className={`p-2.5 size-13 bg-white/6 rounded transition-all ring-2 ring-transparent cursor-pointer ${aspectRatio === "16:9" ? "ring-violet-500/50 bg-white/10" : ""}`}
                />
              </div>
            </div>
            <div className="mb-4 text-gray-300">
              <label htmlFor="userPrompt" className="block text-sm mb-4">
                Prompt{" "}
                <span className="text-sm text-violet-400">(optional)</span>
              </label>
              <textarea
                id="userPrompt"
                rows={4}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Add your prompt"
                className="w-full bg-white/3 rounded-lg border-2 p-4 border-violet-200/10 text-sm focus:border-violet-500/50 outline-none resize-none transition-all"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-center mt-10">
          <PrimaryButton
            disabled={isGenerating}
            className="px-10 py-3 rounded-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2Icon className="size-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2Icon className="size-5" />
                Generate image
              </>
            )}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
};

export default Generator;
