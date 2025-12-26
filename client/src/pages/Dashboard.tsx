import { useStats } from "@/hooks/use-stats";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Loader2, TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading } = useStats();

  if (isLoading) {
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  const jobStats = [
    { name: "Success", value: stats.jobs.SUCCESS || 0, color: "hsl(142 76% 36%)" },
    { name: "Failed", value: stats.jobs.FAILED || 0, color: "hsl(0 84% 60%)" },
    { name: "Manual", value: stats.jobs.NEEDS_MANUAL_ACTION || 0, color: "hsl(38 92% 50%)" },
    { name: "Queued", value: stats.jobs.QUEUED || 0, color: "hsl(215 16% 47%)" },
  ];

  const totalJobs = Object.values(stats.jobs).reduce((a, b) => a + b, 0);
  const successRate = totalJobs > 0 ? Math.round(((stats.jobs.SUCCESS || 0) / totalJobs) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-muted-foreground mt-2">Real-time automation metrics and system status.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Jobs"
          value={totalJobs}
          icon={TrendingUp}
          trend="+12% from yesterday"
          trendGood={true}
        />
        <StatCard
          title="Success Rate"
          value={`${successRate}%`}
          icon={CheckCircle2}
          trend="Target: 95%"
          trendGood={successRate >= 95}
        />
        <StatCard
          title="Manual Action"
          value={stats.jobs.NEEDS_MANUAL_ACTION || 0}
          icon={AlertTriangle}
          alert={true}
        />
        <StatCard
          title="Pending Queue"
          value={stats.jobs.QUEUED || 0}
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg shadow-black/5 border-border/50">
          <CardHeader>
            <CardTitle>Job Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jobStats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                    {jobStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg shadow-black/5 border-border/50">
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium">Email Poller</span>
              </div>
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium">PDF Processor</span>
              </div>
              <span className="text-sm text-muted-foreground">Idle</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium">Uploader Bot</span>
              </div>
              <span className="text-sm text-muted-foreground">Processing Job #1023</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendGood, alert }: any) {
  return (
    <Card className={cn(
      "border shadow-md transition-all duration-200 hover:shadow-lg hover:-translate-y-1",
      alert ? "border-amber-200 bg-amber-50/50" : "border-border/50"
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className={cn("h-4 w-4", alert ? "text-amber-500" : "text-muted-foreground")} />
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-3xl font-bold font-display tracking-tight">{value}</div>
          {trend && (
            <p className={cn("text-xs font-medium", trendGood ? "text-emerald-600" : "text-muted-foreground")}>
              {trend}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { cn } from "@/lib/utils";
