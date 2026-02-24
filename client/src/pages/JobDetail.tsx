import { useJob, useRetryJob, useSelectCandidate } from "@/hooks/use-jobs";
import { useParams, Link } from "wouter";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, RefreshCw, FileText, Image as ImageIcon, Terminal, User, Banknote, Upload, Search } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function maskName(name: string): string {
  if (!name || name.length < 4) return '****';
  const parts = name.split(' ');
  return parts.map(p => p.length > 2 ? p.substring(0, 2) + '***' : p).join(' ');
}

function formatCents(cents: number | null): string {
  if (cents === null) return 'N/A';
  return (cents / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
}

export default function JobDetail() {
  const { id } = useParams();
  const jobId = Number(id);
  const { data: job, isLoading } = useJob(jobId);
  const { mutate: retry, isPending: isRetrying } = useRetryJob();
  const { mutate: selectCandidate, isPending: isSelecting } = useSelectCandidate();
  const { toast } = useToast();

  const candidates = job?.candidatesJson ? JSON.parse(job.candidatesJson as string) : [];
  const [manualOrderId, setManualOrderId] = useState('');

  if (isLoading) {
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h2 className="text-2xl font-bold">Job Not Found</h2>
        <Link href="/jobs">
          <Button variant="outline">Back to Jobs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Link href="/jobs" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-2">
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back to Jobs
          </Link>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold tracking-tight font-display">{job.orderId}</h2>
            <StatusBadge status={job.status as any} className="text-sm px-3 py-1" />
          </div>
          <p className="text-muted-foreground font-mono text-xs">Job ID: {job.id} • Created {format(new Date(job.createdAt), "PPP p")}</p>
        </div>
        
        <div className="flex gap-3">
          {(job.status === "FAILED" || job.status === "NEEDS_MANUAL_ACTION") && (
            <Button 
              onClick={() => retry(job.id)} 
              disabled={isRetrying}
              className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry Job
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Details */}
        <div className="space-y-8 lg:col-span-1">
          <Card className="shadow-md border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Attempts</span>
                  <span className="font-mono">{job.attempts}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Last Updated</span>
                  <span className="font-mono">{format(new Date(job.updatedAt), "HH:mm:ss")}</span>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-2">Attachment</span>
                <div className="bg-muted/30 p-3 rounded-lg border border-border/50 flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-500/50" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{job.attachment.filename}</p>
                    <p className="text-xs text-muted-foreground font-mono">{(job.attachment.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              </div>

              {(job.insuredNameRaw || job.amountCents) && (
                <>
                  <Separator />
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-2">Extracted Info</span>
                    <div className="space-y-2">
                      {job.insuredNameRaw && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{maskName(job.insuredNameRaw as string)}</span>
                        </div>
                      )}
                      {job.amountCents && (
                        <div className="flex items-center gap-2 text-sm">
                          <Banknote className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{formatCents(job.amountCents as number)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {job.matchDecision && (
                <>
                  <Separator />
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-2">Match Decision</span>
                    <div className="text-sm">
                      <span className={cn(
                        "font-medium",
                        job.matchDecision === "AUTO_UPLOAD" ? "text-green-600" : "text-amber-600"
                      )}>{job.matchDecision}</span>
                      {job.matchReason && (
                        <p className="text-xs text-muted-foreground mt-1">{job.matchReason as string}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {job.lastError && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg p-4 text-sm text-red-600 dark:text-red-400">
                  <p className="font-semibold mb-1">Last Error:</p>
                  <p className="break-words font-mono text-xs">{job.lastError}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {job.status === "NEEDS_MANUAL_ACTION" && (
            <Card className="shadow-md border-border/50 border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="text-lg text-amber-700 dark:text-amber-400">
                  {candidates.length > 0 ? 'Sipariş Seç' : 'Manuel Sipariş Girişi'}
                </CardTitle>
                <CardDescription>
                  {candidates.length > 0
                    ? `${candidates.length} aday bulundu. Doğru siparişi seçin.`
                    : 'Eşleşen sipariş bulunamadı. Sipariş numarasını elle girin.'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {candidates.length > 0 ? (
                  candidates.map((candidate: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50"
                      data-testid={`candidate-${idx}`}
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{candidate.orderId}</p>
                        <p className="text-xs text-muted-foreground">
                          {maskName(candidate.customerName)} - {formatCents(candidate.amountCents)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          selectCandidate({ jobId: job.id, orderId: candidate.orderId }, {
                            onSuccess: () => {
                              toast({ title: "Sipariş Seçildi", description: "İş tekrar işlenecek." });
                            }
                          });
                        }}
                        disabled={isSelecting}
                        data-testid={`button-select-${idx}`}
                      >
                        {isSelecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                        Yükle
                      </Button>
                    </div>
                  ))
                ) : null}

                {/* Manuel siparis numarasi girisi */}
                <Separator />
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    Sipariş Numarasını Elle Girin
                  </span>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="PTT-XXXXXXXXX-XXXXXX"
                        value={manualOrderId}
                        onChange={(e) => setManualOrderId(e.target.value)}
                        className="pl-9 font-mono text-sm"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        if (!manualOrderId.trim()) return;
                        selectCandidate({ jobId: job.id, orderId: manualOrderId.trim() }, {
                          onSuccess: () => {
                            toast({ title: "Sipariş Atandı", description: `${manualOrderId} siparişine yüklenecek.` });
                            setManualOrderId('');
                          }
                        });
                      }}
                      disabled={isSelecting || !manualOrderId.trim()}
                    >
                      {isSelecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                      Yükle
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-md border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Evidence</CardTitle>
            </CardHeader>
            <CardContent>
              {job.uploads && job.uploads.length > 0 ? (
                <div className="space-y-4">
                  {job.uploads.map((upload, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="text-xs text-muted-foreground flex justify-between">
                        <span>PTT Order: {upload.pttOrderId}</span>
                        <span>{format(new Date(upload.uploadedAt), "HH:mm")}</span>
                      </div>
                      {upload.evidencePath ? (
                        <div className="relative group rounded-lg overflow-hidden border border-border/50 bg-muted/20 aspect-video">
                          <img 
                            src={upload.evidencePath} 
                            alt="Evidence" 
                            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button variant="secondary" size="sm">
                              <ImageIcon className="mr-2 h-4 w-4" />
                              View Full
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="h-24 bg-muted/20 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground text-xs">
                          No screenshot available
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No uploads recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Logs */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-md border-border/50 h-full flex flex-col">
            <CardHeader className="border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-lg font-mono">Execution Logs</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 bg-[#1e1e1e] text-gray-300 font-mono text-xs overflow-hidden rounded-b-xl min-h-[500px]">
              <div className="p-4 space-y-1 h-full overflow-auto max-h-[600px]">
                {job.logs && job.logs.length > 0 ? (
                  job.logs.map((log, i) => (
                    <div key={i} className="flex gap-3 hover:bg-white/5 p-0.5 rounded px-2">
                      <span className="text-gray-500 shrink-0 select-none">
                        {String(i + 1).padStart(3, '0')}
                      </span>
                      <span className={cn(
                        "break-all",
                        log.includes("ERROR") ? "text-red-400" :
                        log.includes("SUCCESS") ? "text-emerald-400" :
                        log.includes("WARN") ? "text-amber-400" :
                        "text-gray-300"
                      )}>{log}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-600 italic p-4">Waiting for logs...</div>
                )}
                {job.status === "RUNNING" && (
                  <div className="animate-pulse flex gap-2 px-2 text-primary">
                    <span className="text-gray-500">...</span>
                    <span>_</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
