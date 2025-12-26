import { useState } from "react";
import { useMappings, useCreateMapping } from "@/hooks/use-mappings";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMappingSchema, type InsertMapping } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Plus, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default function Mappings() {
  const { data: mappings, isLoading } = useMappings();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Order Mappings</h2>
          <p className="text-muted-foreground mt-1">Configure manual overrides for messy order IDs.</p>
        </div>
        <CreateMappingDialog open={open} onOpenChange={setOpen} />
      </div>

      <Card className="shadow-lg shadow-black/5 border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="w-[40%]">Extracted ID (Messy)</TableHead>
                  <TableHead className="w-[10%]"></TableHead>
                  <TableHead className="w-[40%]">Normalized ID (Clean)</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings?.map((mapping) => (
                  <TableRow key={mapping.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm bg-red-50/50 dark:bg-red-900/10 text-red-700 dark:text-red-400 rounded-l-lg">
                      {mapping.extractedOrderId}
                    </TableCell>
                    <TableCell className="text-center">
                      <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 rounded-r-lg">
                      {mapping.normalizedOrderId}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">
                      {format(new Date(mapping.createdAt), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
                {mappings?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No mappings defined yet.
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

function CreateMappingDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { mutate: createMapping, isPending } = useCreateMapping();
  
  const form = useForm<InsertMapping>({
    resolver: zodResolver(insertMappingSchema),
    defaultValues: {
      extractedOrderId: "",
      normalizedOrderId: "",
    },
  });

  const onSubmit = (data: InsertMapping) => {
    createMapping(data, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="shadow-lg shadow-primary/20">
          <Plus className="mr-2 h-4 w-4" />
          Add Mapping
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Mapping</DialogTitle>
          <DialogDescription>
            Map a messy Order ID string to its correct, normalized format.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="extractedOrderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Extracted ID (Exact Match)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. ORDER-123 (Copy)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="normalizedOrderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Normalized ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. ORDER-123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Mapping"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
