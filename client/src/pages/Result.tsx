import { useEffect, useState } from "react";
import type { Project } from "../types";
import {
  ImageIcon,
  Loader2Icon,
  RefreshCwIcon,
  SparkleIcon,
  VideoIcon,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { GhostButton, PrimaryButton } from "../components/Buttons";
import { useAuth, useUser } from "@clerk/react";
import api from "../config/axios";
import toast from "react-hot-toast";

const Result = () => {
  const { projectid } = useParams();
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const [project, setProjectData] = useState<Project>({} as Project);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();

  const fetchProjectData = async () => {
    try {
      const token = await getToken();
      const { data } = await api.get(`/api/user/projects/${projectid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjectData(data.project);
      setIsGenerating(data.project.isGenerating);
      setLoading(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  const handleGenerateVideo = async () => {
    setIsGenerating(true);
    try {
      const token = await getToken();
      const { data } = await api.post(
        "/api/project/video",
        { projectid },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setProjectData((prev) => ({
        ...prev,
        generatedVideo: data.videoUrl,
        isGenerating: false,
      }));
      toast.success(data.message);
      setIsGenerating(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    }
  };

  useEffect(() => {
    if (user && !project.id) {
      fetchProjectData();
    }else if(isLoaded && !user){
      navigate('/')
    }
  }, [user]);

  useEffect(()=>{
    if(user && isGenerating){
      const interval = setInterval(()=>{
        fetchProjectData()
      }, 10000)
      return ()=> clearInterval(interval)
    }
  },[user, isGenerating])

  return loading ? (
    <div className="h-screen w-full items-center justify-center flex">
      <Loader2Icon className="animate-spin text-indigo-500 size-9" />
    </div>
  ) : (
    <div className="min-h-screen text-white p-6 md:p-12 mt-20">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-medium md:text-3xl">
            Generation Result
          </h1>
          <Link
            to="/generate"
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <RefreshCwIcon className="w-4 h-4" />
            <p className="max-sm:hidden">New Generation</p>
          </Link>
        </header>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel inline-block p-2 rounded-2xl">
              <div
                className={`${project?.aspectRatio === "9:16" ? "aspect-9/16" : "aspect-video"} sm:max-h-200 rounded-xl bg-gray-900 overflow-hidden  relative`}
              >
                {project?.generatedVideo ? (
                  <video
                    src={project.generatedVideo}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={project.generatedImage}
                    alt="generated result"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl">
              <h3>Action</h3>
              <div className="flex flex-col gap-3">
                <a href={project.generatedImage} download>
                  <GhostButton
                    className="w-full justify-center rounded-md py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!project.generatedImage}
                  >
                    <ImageIcon className="size-4.5" />
                    Download image
                  </GhostButton>
                </a>
                <a href={project.generatedVideo} download>
                  <GhostButton
                    className="w-full justify-center rounded-md py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!project.generatedVideo}
                  >
                    <VideoIcon className="size-4.5" />
                    Download Video
                  </GhostButton>
                </a>
              </div>
            </div>
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <VideoIcon className="size-24" />
              </div>
              <h3 className="text-xl mb-2 font-semibold">Video magic</h3>
              <p className="text-gray-400 text-sm mb-6">
                Turn this static image into dynamic video for social media.
              </p>
              {!project.generatedVideo ? (
                <PrimaryButton
                  onClick={handleGenerateVideo}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>Generating video...</>
                  ) : (
                    <>
                      <SparkleIcon className="size=4" />
                      Generate video
                    </>
                  )}
                </PrimaryButton>
              ) : (
                <div className="p-3 bg-green-500/10 boorder border-green-500/20 rounded-xl text-green-400 text-center text-sm font-medium">
                  Video Generate successfully!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Result;
