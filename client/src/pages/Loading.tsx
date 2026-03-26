import { Loader2Icon } from "lucide-react"
import { useEffect } from "react"


const Loading = () => {

  useEffect(()=>{
    setTimeout(()=>{
      window.location.href='/'
    },6000)
  },[])

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-center flex-1">
        <Loader2Icon className="text-indigo-400 size-7 animate-spin"/>
      </div>
    </div>
  )
}

export default Loading
