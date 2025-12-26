import { Bot, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Login() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] rounded-full bg-blue-400/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md p-8 bg-card/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl relative z-10 animate-in">
        <div className="text-center mb-10">
          <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/10 ring-4 ring-primary/5">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2 tracking-tight text-foreground">
            PTT Automation
          </h1>
          <p className="text-muted-foreground text-lg">
            Sign in to access the control center
          </p>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={handleLogin}
            className="w-full h-12 text-base font-semibold shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5"
          >
            Log in with Replit
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          
          <p className="text-center text-xs text-muted-foreground mt-8">
            Restricted access system. <br/>Authorized personnel only.
          </p>
        </div>
      </div>
    </div>
  );
}
