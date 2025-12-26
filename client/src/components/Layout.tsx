import { Link, useLocation } from "wouter";
import { LayoutDashboard, Briefcase, GitMerge, Settings, LogOut, Bot } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/jobs", label: "Jobs", icon: Briefcase },
    { href: "/mappings", label: "Mappings", icon: GitMerge },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col fixed h-full z-20 transition-all duration-300">
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg tracking-tight">PTT AutoBot</h1>
              <p className="text-xs text-muted-foreground font-medium">Admin Console</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                <item.icon className={cn("h-4 w-4", isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50 bg-muted/20">
          <div className="flex items-center gap-3 mb-4 px-2">
            <img 
              src={user?.profileImageUrl || "https://ui-avatars.com/api/?name=Admin"} 
              alt="Profile" 
              className="h-8 w-8 rounded-full border border-border"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.firstName || "Admin"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5"
            onClick={() => logout()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen relative">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto p-8 animate-in">
          {children}
        </div>
      </main>
    </div>
  );
}
