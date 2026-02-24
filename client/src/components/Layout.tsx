import { Link, useLocation } from "wouter";
import { LayoutDashboard, Briefcase, GitMerge, Upload, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/upload", label: "Upload PDFs", icon: Upload },
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
              <p className="text-xs text-muted-foreground font-medium">Masaustu Uygulama</p>
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
          <p className="text-xs text-muted-foreground text-center">PTTAVM Sigorta Bot v1.0</p>
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
