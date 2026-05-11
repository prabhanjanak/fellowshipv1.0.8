import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Plus, GraduationCap, Users, Star, Trash2, Edit2, FileText, Loader2, Link2, ExternalLink } from "lucide-react";
import { useToast } from "../hooks/use-toast";

interface Program {
  id: number;
  name: string;
  code: string;
  description: string | null;
  academicYear: string;
  offerLetterTemplateId: string | null;
  totalSeats: number;
  specialityCount: number;
  candidateCount: number;
}

interface DocTemplate {
  id: number;
  programId: number;
  name: string;
  googleDocId: string;
}

export default function ProgramsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editProgram, setEditProgram] = useState<Program | null>(null);
  const [templateManager, setTemplateManager] = useState<Program | null>(null);
  
  const canManage = ["super_admin", "program_admin"].includes(user?.role ?? "");
  const [form, setForm] = useState({ name: "", code: "", description: "", academicYear: "2026", offerLetterTemplateId: "" });
  const [tplForm, setTplForm] = useState({ name: "", googleDocId: "" });

  const { data: programs = [], isLoading } = useQuery<Program[]>({
    queryKey: ["programs"],
    queryFn: () => api.get<Program[]>("/programs"),
  });

  const { data: templates = [], isLoading: isLoadingTpls } = useQuery<DocTemplate[]>({
    queryKey: ["document-templates", templateManager?.id],
    queryFn: () => templateManager ? api.get<DocTemplate[]>(`/programs/${templateManager.id}/templates`) : Promise.resolve([]),
    enabled: !!templateManager,
  });

  const addMutation = useMutation({
    mutationFn: (data: typeof form) => api.post<Program>("/programs", data),
    onSuccess: () => {
      toast({ title: "Program created" });
      qc.invalidateQueries({ queryKey: ["programs"] });
      setAddOpen(false);
      setForm({ name: "", code: "", description: "", academicYear: "2026", offerLetterTemplateId: "" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Program>) => api.patch<Program>(`/programs/${data.id}`, data),
    onSuccess: () => {
      toast({ title: "Program updated" });
      qc.invalidateQueries({ queryKey: ["programs"] });
      setEditProgram(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addTplMutation = useMutation({
    mutationFn: (data: any) => api.post("/document-templates", data),
    onSuccess: () => {
      toast({ title: "Template added" });
      qc.invalidateQueries({ queryKey: ["document-templates", templateManager?.id] });
      setTplForm({ name: "", googleDocId: "" });
    },
  });

  const deleteTplMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/document-templates/${id}`),
    onSuccess: () => {
      toast({ title: "Template removed" });
      qc.invalidateQueries({ queryKey: ["document-templates", templateManager?.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/programs/${id}`),
    onSuccess: () => {
      toast({ title: "Program deleted" });
      qc.invalidateQueries({ queryKey: ["programs"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">PROGRAMS</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">Manage academic fellowships & document templates</p>
        </div>
        {canManage && (
          <Button onClick={() => setAddOpen(true)} className="gap-2 font-black uppercase tracking-widest text-xs h-10 px-6">
            <Plus className="h-4 w-4" /> Add New Program
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {programs.map((p) => (
            <Card key={p.id} className="hover:shadow-2xl transition-all relative group border-slate-200 overflow-hidden bg-white">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-black tracking-tight text-slate-800 uppercase">{p.name}</CardTitle>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{p.description || "No description provided."}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-slate-900 text-white border-none font-black text-[10px]">{p.academicYear}</Badge>
                    {canManage && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50"
                          onClick={() => setTemplateManager(p)}
                          title="Manage Letter Templates"
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-primary hover:bg-primary/5"
                          onClick={() => setEditProgram(p)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50"
                          onClick={() => {
                            if (confirm("Delete this program? All data will be lost.")) {
                              deleteMutation.mutate(p.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-8 py-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Specialities</span>
                    <span className="text-xl font-black text-slate-800 leading-none">{p.specialityCount}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Candidates</span>
                    <span className="text-xl font-black text-slate-800 leading-none">{p.candidateCount}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Seats</span>
                    <span className="text-xl font-black text-slate-800 leading-none">{p.totalSeats}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between border-t pt-4 border-slate-100">
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5"
                    onClick={() => setTemplateManager(p)}
                  >
                    <FileText className="h-3.5 w-3.5" /> Configure Letter Templates
                  </Button>
                  <code className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded tracking-widest">{p.code}</code>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Manager Dialog */}
      <Dialog open={!!templateManager} onOpenChange={() => setTemplateManager(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-black text-xl uppercase tracking-tight flex items-center gap-2">
              <Link2 className="h-5 w-5 text-amber-500" />
              Document Template Center
            </DialogTitle>
            <DialogDescription className="font-bold text-xs uppercase text-slate-400">Manage multiple letter types for {templateManager?.name}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Add New Template Form */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Add New Letter Template</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Letter Name</Label>
                  <Input 
                    placeholder="e.g. Fellowship Offer Letter" 
                    value={tplForm.name} 
                    onChange={e => setTplForm({...tplForm, name: e.target.value})}
                    className="h-9 font-bold text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Google Doc ID</Label>
                  <Input 
                    placeholder="1aBc2DeFg..." 
                    value={tplForm.googleDocId} 
                    onChange={e => setTplForm({...tplForm, googleDocId: e.target.value})}
                    className="h-9 font-bold text-sm"
                  />
                </div>
              </div>
              <Button 
                onClick={() => addTplMutation.mutate({ ...tplForm, programId: templateManager?.id })}
                disabled={!tplForm.name || !tplForm.googleDocId || addTplMutation.isPending}
                className="w-full h-9 font-black uppercase tracking-widest text-xs gap-2"
              >
                {addTplMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Template to Program
              </Button>
            </div>

            {/* List of Templates */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Existing Templates</h3>
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                {isLoadingTpls ? <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div> : 
                 templates.length === 0 ? <div className="text-center py-8 text-slate-300 font-bold uppercase text-[10px] border-2 border-dashed rounded-lg">No templates linked yet</div> :
                 templates.map(tpl => (
                  <div key={tpl.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg group hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-amber-50 text-amber-600 rounded flex items-center justify-center font-black text-xs">
                        {tpl.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-800 uppercase tracking-tight">{tpl.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">ID: {tpl.googleDocId.substring(0, 15)}...</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                        <a href={`https://docs.google.com/document/d/${tpl.googleDocId}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 text-slate-400" /></a>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50" onClick={() => deleteTplMutation.mutate(tpl.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                 ))
                }
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setTemplateManager(null)} className="font-black uppercase tracking-widest text-xs">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Program Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-black text-xl uppercase tracking-tight">CREATE FELLOWSHIP PROGRAM</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500">Program Name</Label>
              <Input placeholder="e.g. Fellowship in Cornea & External Disease" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500">Program Code</Label>
                <Input placeholder="COR-2026" value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} className="font-mono font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500">Academic Year</Label>
                <Input placeholder="2026" value={form.academicYear} onChange={(e) => setForm(f => ({ ...f, academicYear: e.target.value }))} className="font-bold" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500">Program Description</Label>
              <Input placeholder="Brief overview of the program" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="font-bold" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="font-bold uppercase text-[10px]">Cancel</Button>
            <Button
              className="font-black uppercase tracking-widest text-[10px] bg-primary"
              disabled={!form.name || !form.code || addMutation.isPending}
              onClick={() => addMutation.mutate(form)}
            >
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Program Dialog */}
      <Dialog open={!!editProgram} onOpenChange={() => setEditProgram(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black text-xl uppercase tracking-tight">EDIT PROGRAM CONFIG</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="space-y-2">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500">Program Name</Label>
              <Input value={editProgram?.name || ""} onChange={(e) => setEditProgram(p => p ? { ...p, name: e.target.value } : null)} className="font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500">Description</Label>
              <Input value={editProgram?.description || ""} onChange={(e) => setEditProgram(p => p ? { ...p, description: e.target.value } : null)} className="font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="font-black text-[10px] uppercase tracking-widest text-primary">Global Fallback Template ID</Label>
              <Input 
                placeholder="1aBc2..." 
                value={editProgram?.offerLetterTemplateId || ""} 
                onChange={(e) => setEditProgram(p => p ? { ...p, offerLetterTemplateId: e.target.value } : null)}
                className="border-primary/20 bg-primary/5 font-mono font-bold"
              />
              <p className="text-[9px] text-muted-foreground italic font-bold">This is used if no specific letter type is selected in the Allocations page.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProgram(null)} className="font-bold uppercase text-[10px]">Cancel</Button>
            <Button
              className="font-black uppercase tracking-widest text-[10px]"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate(editProgram!)}
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
