import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Trophy, Medal } from "lucide-react";

interface Program { id: number; name: string; code: string; }
interface CandidateRank {
  candidateId: number;
  candidateCode: string;
  fullName: string;
  mcqScore: number | null;
  psychometricScore: number | null;
  interviewScore: number | null;
  totalScore: number | null;
  rank: number;
  topPreference: string | null;
  unitName: string | null;
  status: string | null;
}

const statusColors: Record<string, string> = {
  allocated: "bg-emerald-100 text-emerald-800 border-emerald-200",
  interview_completed: "bg-orange-100 text-orange-800 border-orange-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  waitlisted: "bg-purple-100 text-purple-800 border-purple-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

function fmt(v: number | null) {
  return v != null ? v.toFixed(1) : "—";
}

export default function RankingsPage() {
  const [selectedProgram, setSelectedProgram] = useState<string>("");

  const { data: programs = [] } = useQuery<Program[]>({
    queryKey: ["programs"],
    queryFn: () => api.get<Program[]>("/programs"),
  });

  const { data: rankings = [], isLoading } = useQuery<CandidateRank[]>({
    queryKey: ["rankings", selectedProgram],
    queryFn: () => api.get<CandidateRank[]>(`/rankings?programId=${selectedProgram}`),
    enabled: !!selectedProgram,
  });

  const allocatedCount = rankings.filter((r) => r.status === "allocated").length;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-black p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 via-amber-600 to-orange-500 p-8 text-white shadow-2xl">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-orange-100 text-sm font-medium">
              <Trophy className="h-4 w-4" />
              <span>Merit Register & Standing</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Candidate Rankings</h1>
            <p className="text-orange-100/80 max-w-md">Analyze merit-based rankings, track multi-stage examination performance, and manage candidate standing across institutional programs.</p>
          </div>
          {selectedProgram && rankings.length > 0 && (
            <div className="flex gap-3 bg-black/10 p-4 rounded-2xl backdrop-blur-md">
              <div className="text-center px-4 border-r border-white/10">
                <p className="text-[10px] font-black text-orange-200 uppercase tracking-widest">Allocated</p>
                <p className="text-2xl font-black">{allocatedCount}</p>
              </div>
              <div className="text-center px-4">
                <p className="text-[10px] font-black text-orange-200 uppercase tracking-widest">Waitlisted</p>
                <p className="text-2xl font-black">{rankings.length - allocatedCount}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-xs">
        <Select value={selectedProgram} onValueChange={setSelectedProgram}>
          <SelectTrigger>
            <SelectValue placeholder="Select a program…" />
          </SelectTrigger>
          <SelectContent>
            {programs.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedProgram ? (
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Select a program to view rankings</p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Computing rankings…</div>
      ) : rankings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No candidates with scores for this program</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              {rankings.length} candidates ranked
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-12">Rank</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Candidate</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Speciality</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Unit</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">MCQ</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Psycho</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Interview</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((r, idx) => {
                    const isAllocated = r.status === "allocated";
                    return (
                      <tr key={r.candidateId} className={`border-b last:border-0 hover:bg-muted/20 ${isAllocated ? "bg-emerald-50/50 dark:bg-emerald-950/10" : ""}`}>
                        <td className="px-4 py-3">
                          {idx < 3 ? (
                            <Medal className={`h-5 w-5 ${idx === 0 ? "text-yellow-500" : idx === 1 ? "text-gray-400" : "text-amber-600"}`} />
                          ) : (
                            <span className="font-bold text-muted-foreground">#{r.rank}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{r.fullName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{r.candidateCode}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {r.topPreference ?? <span className="text-muted-foreground/50">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {r.unitName ?? <span className="text-muted-foreground/50">—</span>}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{fmt(r.mcqScore)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{fmt(r.psychometricScore)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{fmt(r.interviewScore)}</td>
                        <td className="px-4 py-3 text-right">
                          <Badge className="bg-primary/10 text-primary font-bold border border-primary/20">
                            {r.totalScore != null ? r.totalScore.toFixed(1) : "—"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.status ? (
                            <Badge variant="outline" className={`text-xs ${statusColors[r.status] ?? ""}`}>
                              {r.status.replace(/_/g, " ")}
                            </Badge>
                          ) : <span className="text-muted-foreground/50 text-xs">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

