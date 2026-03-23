"use client";

import { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ComposedChart,
} from "recharts";

// ── Types ──
interface ReportRow {
  startup: string;
  week: string;
  leadsGenerated: number;
  qualificationsHeld: number;
  offersSent: number;
  newCustomers: number;
  newARR: number;
  customersLost: number;
  arrLost: number;
  totalCustomers: number;
  arrStart: number;
  arrEnd: number;
  projectedARR: number;
  type: "weekly" | "monthly";
  status: string;
}

const COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
];

const formatEuro = (v: number) => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M\u20ac`;
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k\u20ac`;
  return `${v}\u20ac`;
};

const formatWeek = (w: string) => {
  const d = new Date(w + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

// ── Metric Card ──
function MetricCard({ label, value, subtext, trend, color = "indigo" }: {
  label: string; value: string | number; subtext?: string;
  trend?: number; color?: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    red: "bg-red-50 border-red-200 text-red-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };
  return (
    <div className={`rounded-xl border-2 p-4 ${colorMap[color] || colorMap.indigo}`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {subtext && <div className="mt-1 text-xs opacity-60">{subtext}</div>}
      {trend !== undefined && (
        <div className={`mt-1 text-xs font-semibold ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          {trend >= 0 ? "\u25b2" : "\u25bc"} {Math.abs(trend).toFixed(1)}% vs semaine pr\u00e9c\u00e9dente
        </div>
      )}
    </div>
  );
}

// ── Startup Tabs ──
function StartupTabs({ startups, selected, onSelect }: {
  startups: string[]; selected: string; onSelect: (s: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => onSelect("all")}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          selected === "all"
            ? "bg-indigo-600 text-white shadow-md"
            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
        }`}>
        Toutes les startups
      </button>
      {startups.map((s, i) => (
        <button key={s} onClick={() => onSelect(s)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selected === s ? "text-white shadow-md"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
          style={selected === s ? { backgroundColor: COLORS[i % COLORS.length] } : {}}>
          {s}
        </button>
      ))}
    </div>
  );
}

// ── Pipeline Funnel ──
function PipelineFunnel({ data }: { data: ReportRow[] }) {
  const stages = [
    { key: "leadsGenerated" as const, label: "Leads", color: "#6366f1" },
    { key: "qualificationsHeld" as const, label: "Qualifs", color: "#8b5cf6" },
    { key: "offersSent" as const, label: "Offres", color: "#f59e0b" },
    { key: "newCustomers" as const, label: "Clients", color: "#10b981" },
  ];
  const totals = stages.map((s) => ({
    ...s, value: data.reduce((sum, d) => sum + (d[s.key] || 0), 0),
  }));
  const max = Math.max(...totals.map((t) => t.value), 1);

  return (
    <div className="space-y-3">
      {totals.map((stage) => (
        <div key={stage.key} className="flex items-center gap-3">
          <div className="w-16 text-xs font-medium text-gray-500 text-right">{stage.label}</div>
          <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
            <div className="h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700"
              style={{ width: `${Math.max((stage.value / max) * 100, 8)}%`, backgroundColor: stage.color }}>
              <span className="text-white text-xs font-bold">{stage.value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty State ──
function EmptyState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Aucune donn\u00e9e pour le moment</h2>
        <p className="text-gray-500">
          Les donn\u00e9es appara\u00eetront ici d\u00e8s que les founders soumettront leur premier reporting hebdomadaire via Claude.
        </p>
      </div>
    </div>
  );
}

// ── Main Dashboard ──
export default function Dashboard({ initialData }: { initialData: ReportRow[] }) {
  const [data, setData] = useState<ReportRow[]>(initialData);
  const [selectedStartup, setSelectedStartup] = useState("all");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/reports");
        if (res.ok) {
          const fresh = await res.json();
          setData(fresh);
          setLastRefresh(new Date());
        }
      } catch {}
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const weeklyData = useMemo(() => data.filter((d) => d.type === "weekly"), [data]);

  const startups = useMemo(
    () => [...new Set(weeklyData.map((d) => d.startup))].sort(),
    [weeklyData]
  );

  const filteredData = useMemo(
    () => selectedStartup === "all" ? weeklyData
      : weeklyData.filter((d) => d.startup === selectedStartup),
    [selectedStartup, weeklyData]
  );

  // Aggregate by week
  const chartData = useMemo(() => {
    const weeks = [...new Set(filteredData.map((d) => d.week))].sort();
    if (selectedStartup === "all") {
      return weeks.map((w) => {
        const wd = filteredData.filter((d) => d.week === w);
        return {
          week: formatWeek(w), rawWeek: w,
          leadsGenerated: wd.reduce((s, d) => s + d.leadsGenerated, 0),
          qualificationsHeld: wd.reduce((s, d) => s + d.qualificationsHeld, 0),
          offersSent: wd.reduce((s, d) => s + d.offersSent, 0),
          newCustomers: wd.reduce((s, d) => s + d.newCustomers, 0),
          arrEnd: wd.reduce((s, d) => s + d.arrEnd, 0),
          projectedARR: wd.reduce((s, d) => s + d.projectedARR, 0),
          newARR: wd.reduce((s, d) => s + d.newARR, 0),
        };
      });
    }
    return weeks.map((w) => {
      const d = filteredData.find((x) => x.week === w)!;
      return { week: formatWeek(w), rawWeek: w, ...d };
    });
  }, [filteredData, selectedStartup]);

  // Per-startup ARR stacked
  const arrByStartup = useMemo(() => {
    const weeks = [...new Set(weeklyData.map((d) => d.week))].sort();
    return weeks.map((w) => {
      const row: any = { week: formatWeek(w) };
      startups.forEach((s) => {
        const entry = weeklyData.find((d) => d.week === w && d.startup === s);
        row[s] = entry ? entry.arrEnd : 0;
      });
      return row;
    });
  }, [weeklyData, startups]);

  const latestWeek = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const previousWeek = chartData.length > 1 ? chartData[chartData.length - 2] : null;

  const pctChange = (curr: number, prev?: number) => {
    if (!prev || prev === 0) return undefined;
    return ((curr - prev) / prev) * 100;
  };

  if (weeklyData.length === 0) return <EmptyState />;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hexa GTM Dashboard</h1>
            <p className="text-gray-500 mt-1">
              Reporting commercial — {startups.length} startup{startups.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right text-sm text-gray-400">
            Derni\u00e8re MAJ : {lastRefresh.toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        {/* Startup tabs */}
        <StartupTabs startups={startups} selected={selectedStartup} onSelect={setSelectedStartup} />

        {/* KPI cards */}
        {latestWeek && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <MetricCard label="Leads g\u00e9n\u00e9r\u00e9s" value={latestWeek.leadsGenerated}
              trend={pctChange(latestWeek.leadsGenerated, previousWeek?.leadsGenerated)} color="indigo" />
            <MetricCard label="Qualifications" value={latestWeek.qualificationsHeld}
              trend={pctChange(latestWeek.qualificationsHeld, previousWeek?.qualificationsHeld)} color="purple" />
            <MetricCard label="Offres envoy\u00e9es" value={latestWeek.offersSent}
              trend={pctChange(latestWeek.offersSent, previousWeek?.offersSent)} color="amber" />
            <MetricCard label="Nouveaux clients" value={latestWeek.newCustomers}
              trend={pctChange(latestWeek.newCustomers, previousWeek?.newCustomers)} color="green" />
            <MetricCard label="ARR actuel" value={formatEuro(latestWeek.arrEnd || 0)}
              subtext={`Projet\u00e9: ${formatEuro(latestWeek.projectedARR || 0)}`}
              trend={pctChange(latestWeek.arrEnd, previousWeek?.arrEnd)} color="green" />
          </div>
        )}

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {selectedStartup === "all" ? "ARR consolid\u00e9 par startup" : `\u00c9volution ARR \u2014 ${selectedStartup}`}
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              {selectedStartup === "all" ? (
                <AreaChart data={arrByStartup}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={formatEuro} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatEuro(v)} />
                  <Legend />
                  {startups.map((s, i) => (
                    <Area key={s} type="monotone" dataKey={s} stackId="1"
                      fill={COLORS[i % COLORS.length]} stroke={COLORS[i % COLORS.length]} fillOpacity={0.6} />
                  ))}
                </AreaChart>
              ) : (
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={formatEuro} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatEuro(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="projectedARR" name="ARR projet\u00e9"
                    fill="#c7d2fe" stroke="#818cf8" fillOpacity={0.3} />
                  <Line type="monotone" dataKey="arrEnd" name="ARR r\u00e9el"
                    stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Pipeline cette semaine</h2>
            <PipelineFunnel data={filteredData.filter(
              (d) => d.week === [...new Set(filteredData.map((x) => x.week))].sort().pop()
            )} />
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Conversion</div>
              {latestWeek && latestWeek.leadsGenerated > 0 && (
                <div className="space-y-1 text-sm text-gray-600">
                  <div>Lead \u2192 Qualif: <span className="font-semibold">
                    {((latestWeek.qualificationsHeld / latestWeek.leadsGenerated) * 100).toFixed(0)}%</span></div>
                  <div>Qualif \u2192 Offre: <span className="font-semibold">
                    {latestWeek.qualificationsHeld > 0 ? ((latestWeek.offersSent / latestWeek.qualificationsHeld) * 100).toFixed(0) : 0}%</span></div>
                  <div>Offre \u2192 Client: <span className="font-semibold">
                    {latestWeek.offersSent > 0 ? ((latestWeek.newCustomers / latestWeek.offersSent) * 100).toFixed(0) : 0}%</span></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Activit\u00e9 pipeline</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="leadsGenerated" name="Leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="qualificationsHeld" name="Qualifs" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="offersSent" name="Offres" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="newCustomers" name="Clients" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Nouvel ARR par semaine</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatEuro} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatEuro(v)} />
                <Bar dataKey="newARR" name="Nouvel ARR" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Data table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">D\u00e9tail par semaine</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {selectedStartup === "all" && <th className="px-4 py-3 text-left font-medium text-gray-500">Startup</th>}
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Semaine</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Leads</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Qualifs</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Offres</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Clients</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">ARR fin</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">ARR projet\u00e9</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData
                  .sort((a, b) => b.week.localeCompare(a.week) || a.startup.localeCompare(b.startup))
                  .map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      {selectedStartup === "all" && <td className="px-4 py-3 font-medium text-gray-800">{row.startup}</td>}
                      <td className="px-4 py-3 text-gray-600">{formatWeek(row.week)}</td>
                      <td className="px-4 py-3 text-right">{row.leadsGenerated}</td>
                      <td className="px-4 py-3 text-right">{row.qualificationsHeld}</td>
                      <td className="px-4 py-3 text-right">{row.offersSent}</td>
                      <td className="px-4 py-3 text-right">{row.newCustomers}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatEuro(row.arrEnd)}</td>
                      <td className="px-4 py-3 text-right text-indigo-600">{formatEuro(row.projectedARR)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          row.status === "sent" ? "bg-blue-100 text-blue-700" :
                          row.status === "validated" ? "bg-green-100 text-green-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>{row.status || "draft"}</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-4">
          Hexa GTM Dashboard \u2014 Donn\u00e9es en direct depuis Notion \u2022 Auto-refresh toutes les 5 min
        </div>
      </div>
    </div>
  );
}
