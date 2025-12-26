import { useState } from "react";
import { useJobs } from "@/hooks/use-jobs";
import { Link } from "wouter";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Filter, ArrowRight, Eye } from "lucide-react";
import { format } from "date-fns";

export default function Jobs() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const { data: jobs, isLoading } = useJobs({ status: statusFilter });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Jobs</h2>
          <p className="text-muted-foreground mt-1">Manage and monitor automation tasks.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
           <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="shadow-lg shadow-black/5 border-border/50">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by Order ID..." className="pl-9 bg-muted/20 border-border/50" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px] bg-muted/20 border-border/50">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="QUEUED">Queued</SelectItem>
                <SelectItem value="RUNNING">Running</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="NEEDS_MANUAL_ACTION">Manual Action</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Attachment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs?.map((job) => (
                  <TableRow key={job.id} className="hover:bg-muted/30 border-border/50 transition-colors">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{job.id}
                    </TableCell>
                    <TableCell className="font-medium">{job.orderId}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {job.attachment.filename}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.status as any} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(job.createdAt), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/jobs/${job.id}`}>
                        <Button variant="ghost" size="sm" className="hover:text-primary">
                          <Eye className="mr-2 h-4 w-4" />
                          Details
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {jobs?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No jobs found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
