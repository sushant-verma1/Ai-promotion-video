import { useEffect, useState } from "react";
import type { Project } from "../types";
import { Loader2Icon } from "lucide-react";
import ProjectCard from "../components/ProjectCard";
import { PrimaryButton } from "../components/Buttons";
import { useAuth, useUser } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import api from "../config/axios";
import toast from "react-hot-toast";

const Mygeneration = () => {
  const { user , isLoaded } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [generation, setGeneration] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyGeneration = async () => {
    try {
      const token = await getToken();
      const { data } = await api.get("/api/user/projects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGeneration(data.projects);
      setLoading(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
    }
  };
  useEffect(() => {
    if (user) {
      fetchMyGeneration();
    }else if(isLoaded && !user){
      navigate('/')
    }
  }, [user]);
  return loading ? (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2Icon className="animate-spin size-7 text-indigo-400" />
    </div>
  ) : (
    <div className="min-h-screen text-white p-6 md:p-12 my-28">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-3xl md:text-4xl font-semibold mb-4">
            My generation
          </h1>
          <p className="text-gray-400">View and manage your content</p>
        </header>
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
          {generation.map((gen) => (
            <ProjectCard key={gen.id} gen={gen} setGeneration={setGeneration} />
          ))}
        </div>
        {generation.length === 0 && (
          <div className="py-20 bg-white/5 text-center rounded-xl border border-white/10">
            <h3 className="font-medium mb-2 text-xl">No generation yet</h3>
            <p className="text-gray-400 mb-6">
              Start creating stunning photo product today
            </p>
            <PrimaryButton onClick={() => (window.location.href = "/generate")}>
              Create new generation
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default Mygeneration;
