"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ComposedChart,
} from "recharts";

// ═══════════════════════════════════════════════════════════════
// HEXA WEEKLY COMMERCIAL DASHBOARD
// ═══════════════════════════════════════════════════════════════
// 4 sections:
//   1. Lead Generation (Lemlist)
//   2. Product-Led Growth (PostHog)
//   3. Sales Performance (CRM)
//   4. Account Management (Stripe + CRM)
// ═══════════════════════════════════════════════════════════════

interface ReportRow {
  startup: string;
  week: string;
  leadsContacted: number;
  repliesReceived: number;
  meetingsBooked: number;
  qualificationsHeld: number;
  offersSent: number;
  newCustomers: number;
  newARR: number;
  customersChurned: number;
  arrLost: number;
  upsellARR: number;
  totalCustomers: number;
  arrStart: number;
  arrEnd: number;
  projectedARR: number;
  wau: number | null;
  newSignups: number | null;
  type: string;
  status: string;
}

// ── Colors ──
const COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16"
];

const SECTION_COLORS: Record<string, { primary: string; bg: string; border: string; text: string; accent: string }> = {
  leadGen: { primary: "#6366f1", bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", accent: "bg-indigo-600" },
  plg: { primary: "#8b5cf6", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", accent: "bg-purple-600" },
  sales: { primary: "#f59e0b", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", accent: "bg-amber-600" },
  account: { primary: "#10b981", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", accent: "bg-emerald-600" },
};

// ── Helpers ──
const formatEuro = (v: number | null | undefined): string => {
  if (v == null) return "\u2014";
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k\u20AC`;
  return `${v}\u20AC`;
};

const formatWeek = (w: string): string => {
  const d = new Date(w + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

const pctChange = (curr: number | null | undefined, prev: number | null | undefined): number | undefined => {
  if (prev == null || prev === 0 || curr == null) return undefined;
  return ((curr - prev) / prev) * 100;
};

const delta = (curr: number | null | undefined, prev: number | null | undefined): number | null => {
  if (prev == null || curr == null) return null;
  return curr - prev;
};

// ── MetricCard ──
function MetricCard({ label, value, subtext, trend, colorScheme = "leadGen" }: {
  label: string; value: string | number; subtext?: string; trend?: number | null; colorScheme?: string;
}) {
  const c = SECTION_COLORS[colorScheme] || SECTION_COLORS.leadGen;
  return (
    <div className={`rounded-xl border-2 p-4 ${c.bg} ${c.border} ${c.text}`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {subtext && <div className="mt-1 text-xs opacity-60">{subtext}</div>}
      {trend !== undefined && trend !== null && (
        <div className={`mt-1 text-xs font-semibold ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          {trend >= 0 ? "\u25B2" : "\u25BC"} {Math.abs(trend).toFixed(1)}% vs S-1
        </div>
      )}
    </div>
  );
}

// ── SectionHeader ──
function SectionHeader({ number, title, source, colorScheme = "leadGen" }: {
  number: number; title: string; source: string; colorScheme?: string;
}) {
  const c = SECTION_COLORS[colorScheme] || SECTION_COLORS.leadGen;
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className={`${c.accent} text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center`}>
        {number}
      </span>
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{source}</span>
    </div>
  );
}

// ── StartupTabs ──
function StartupTabs({ startups, selected, onSelect }: {
  startups: string[]; selected: string; onSelect: (s: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect("all")}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          selected === "all"
            ? "bg-gray-800 text-white shadow-md"
            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
        }`}
      >
        Toutes les startups
      </button>
      {startups.map((s, i) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selected === s
              ? "text-white shadow-md"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
          style={selected === s ? { backgroundColor: COLORS[i % COLORS.length] } : {}}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

// ── SectionTabs ──
function SectionTabs({ selected, onSelect, hasProductData }: {
  selected: string; onSelect: (s: string) => void; hasProductData: boolean;
}) {
  const tabs = [
    { id: "overview", label: "Vue d\u2019ensemble" },
    { id: "leadgen", label: "1. Lead Gen" },
    ...(hasProductData ? [{ id: "plg", label: "2. Product-Led" }] : []),
    { id: "sales", label: "3. Sales" },
    { id: "account", label: "4. Account Mgmt" },
  ];
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selected === tab.id
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── OutreachFunnel ──
function OutreachFunnel({ data }: { data: ReportRow[] }) {
  const stages = [
    { key: "leadsContacted" as const, label: "Contact\u00E9s", color: "#6366f1" },
    { key: "repliesReceived" as const, label: "R\u00E9ponses", color: "#818cf8" },
    { key: "meetingsBooked" as const, label: "Meetings", color: "#a78bfa" },
  ];
  const totals = stages.map((s) => ({
    ...s,
    value: data.reduce((sum, d) => sum + (d[s.key] || 0), 0),
  }));
  const max = Math.max(...totals.map((t) => t.value), 1);

  return (
    <div className="space-y-3">
      {totals.map((stage, i) => (
        <div key={stage.key}>
          <div className="flex items-center gap-3">
            <div className="w-20 text-xs font-medium text-gray-500 text-right">{stage.label}</div>
            <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
              <div
                className="h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700"
                style={{ width: `${Math.max((stage.value / max) * 100, 8)}%`, backgroundColor: stage.color }}
              >
                <span className="text-white text-xs font-bold">{stage.value}</span>
              </div>
            </div>
          </div>
          {i < totals.length - 1 && totals[i].value > 0 && (
            <div className="ml-24 text-xs text-gray-400 mt-1">
              \u2192 {((totals[i + 1].value / totals[i].value) * 100).toFixed(1)}% conversion
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── SalesFunnel ──
function SalesFunnel({ data }: { data: ReportRow[] }) {
  const stages = [
    { key: "qualificationsHeld" as const, label: "Qualifs", color: "#f59e0b" },
    { key: "offersSent" as const, label: "Offres", color: "#f97316" },
    { key: "newCustomers" as const, label: "Clients", color: "#10b981" },
  ];
  const totals = stages.map((s) => ({
    ...s,
    value: data.reduce((sum, d) => sum + (d[s.key] || 0), 0),
  }));
  const max = Math.max(...totals.map((t) => t.value), 1);

  return (
    <div className="space-y-3">
      {totals.map((stage, i) => (
        <div key={stage.key}>
          <div className="flex items-center gap-3">
            <div className="w-16 text-xs font-medium text-gray-500 text-right">{stage.label}</div>
            <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
              <div
                className="h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700"
                style={{ width: `${Math.max((stage.value / max) * 100, 8)}%`, backgroundColor: stage.color }}
              >
                <span className="text-white text-xs font-bold">{stage.value}</span>
              </div>
            </div>
          </div>
          {i < totals.length - 1 && totals[i].value > 0 && (
            <div className="ml-20 text-xs text-gray-400 mt-1">
              \u2192 {((totals[i + 1].value / totals[i].value) * 100).toFixed(1)}% conversion
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [data, setData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStartup, setSelectedStartup] = useState("all");
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/data.json");
        const json: ReportRow[] = await res.json();
        setData(json);
      } catch (e) {
        console.error("Failed to fetch data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const startups = useMemo(() => [...new Set(data.map((d) => d.startup))], [data]);

  const filteredData = useMemo(
    () =>
      selectedStartup === "all"
        ? data.filter((d) => d.type === "weekly")
        : data.filter((d) => d.startup === selectedStartup && d.type === "weekly"),
    [selectedStartup, data]
  );

  const hasProductData = useMemo(() => filteredData.some((d) => d.wau != null), [filteredData]);

  const chartData = useMemo(() => {
    const weeks = [...new Set(filteredData.map((d) => d.week))].sort();
    if (selectedStartup === "all") {
      return weeks.map((w) => {
        const wd = filteredData.filter((d) => d.week === w);
        const wauEntries = wd.filter((d) => d.wau != null);
        const signupEntries = wd.filter((d) => d.newSignups != null);
        return {
          week: formatWeek(w), rawWeek: w,
          leadsContacted: wd.reduce((s, d) => s + (d.leadsContacted || 0), 0),
          repliesReceived: wd.reduce((s, d) => s + (d.repliesReceived || 0), 0),
          meetingsBooked: wd.reduce((s, d) => s + (d.meetingsBooked || 0), 0),
          qualificationsHeld: wd.reduce((s, d) => s + (d.qualificationsHeld || 0), 0),
          offersSent: wd.reduce((s, d) => s + (d.offersSent || 0), 0),
          newCustomers: wd.reduce((s, d) => s + (d.newCustomers || 0), 0),
          newARR: wd.reduce((s, d) => s + (d.newARR || 0), 0),
          arrEnd: wd.reduce((s, d) => s + (d.arrEnd || 0), 0),
          arrStart: wd.reduce((s, d) => s + (d.arrStart || 0), 0),
          projectedARR: wd.reduce((s, d) => s + (d.projectedARR || 0), 0),
          customersChurned: wd.reduce((s, d) => s + (d.customersChurned || 0), 0),
          arrLost: wd.reduce((s, d) => s + (d.arrLost || 0), 0),
          upsellARR: wd.reduce((s, d) => s + (d.upsellARR || 0), 0),
          totalCustomers: wd.reduce((s, d) => s + (d.totalCustomers || 0), 0),
          wau: wauEntries.length > 0 ? wauEntries.reduce((s, d) => s + (d.wau || 0), 0) : null,
          newSignups: signupEntries.length > 0 ? signupEntries.reduce((s, d) => s + (d.newSignups || 0), 0) : null,
        };
      });
    }
    return weeks.map((w) => {
      const d = filteredData.find((x) => x.week === w);
      return { week: formatWeek(w), rawWeek: w, ...d };
    });
  }, [filteredData, selectedStartup]);

  const arrByStartup = useMemo(() => {
    const allWeekly = data.filter((d) => d.type === "weekly");
    const weeks = [...new Set(allWeekly.map((d) => d.week))].sort();
    return weeks.map((w) => {
      const row: Record<string, unknown> = { week: formatWeek(w) };
      startups.forEach((s) => {
        const entry = allWeekly.find((d) => d.week === w && d.startup === s);
        row[s] = entry ? entry.arrEnd : 0;
      });
      row.total = startups.reduce((sum, s) => sum + ((row[s] as number) || 0), 0);
      return row;
    });
  }, [data, startups]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latestWeek: any = useMemo(() => chartData.length > 0 ? chartData[chartData.length - 1] : null, [chartData]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prevWeek: any = useMemo(() => chartData.length > 1 ? chartData[chartData.length - 2] : null, [chartData]);

  const latestWeekData = useMemo(() => {
    const latestRaw = [...new Set(filteredData.map((x) => x.week))].sort().pop();
    return filteredData.filter((d) => d.week === latestRaw);
  }, [filteredData]);

  const nrr = useMemo(() => {
    if (!latestWeek || !latestWeek.arrStart || latestWeek.arrStart === 0) return null;
    return ((latestWeek.arrEnd + (latestWeek.upsellARR || 0)) / latestWeek.arrStart) * 100;
  }, [latestWeek]);

  const replyRate = useMemo(() => {
    if (!latestWeek || !latestWeek.leadsContacted) return null;
    return (latestWeek.repliesReceived / latestWeek.leadsContacted) * 100;
  }, [latestWeek]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hexa GTM Dashboard</h1>
            <p className="text-gray-500 mt-1">
              Reporting commercial \u2014 {startups.length} startup{startups.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right text-sm text-gray-400">
            Mise \u00E0 jour : {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

        <StartupTabs startups={startups} selected={selectedStartup} onSelect={setSelectedStartup} />
        <SectionTabs selected={activeSection} onSelect={setActiveSection} hasProductData={hasProductData} />

        {/* ═══ OVERVIEW ═══ */}
        {activeSection === "overview" && latestWeek && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Leads contact\u00E9s"
                value={latestWeek.leadsContacted || 0}
                subtext={replyRate != null ? `Taux r\u00E9ponse: ${replyRate.toFixed(1)}%` : undefined}
                trend={pctChange(latestWeek.leadsContacted, prevWeek?.leadsContacted)}
                colorScheme="leadGen"
              />
              {hasProductData ? (
                <MetricCard
                  label="WAU"
                  value={latestWeek.wau || 0}
                  subtext={latestWeek.newSignups != null ? `${latestWeek.newSignups} signups` : undefined}
                  trend={pctChange(latestWeek.wau, prevWeek?.wau)}
                  colorScheme="plg"
                />
              ) : (
                <MetricCard
                  label="Qualifications"
                  value={latestWeek.qualificationsHeld || 0}
                  trend={pctChange(latestWeek.qualificationsHeld, prevWeek?.qualificationsHeld)}
                  colorScheme="sales"
                />
              )}
              <MetricCard
                label="Nouveaux clients"
                value={latestWeek.newCustomers || 0}
                subtext={`+${formatEuro(latestWeek.newARR || 0)} ARR`}
                trend={pctChange(latestWeek.newCustomers, prevWeek?.newCustomers)}
                colorScheme="sales"
              />
              <MetricCard
                label="ARR actuel"
                value={formatEuro(latestWeek.arrEnd || 0)}
                subtext={nrr != null ? `NRR: ${nrr.toFixed(0)}%` : `Projet\u00E9: ${formatEuro(latestWeek.projectedARR || 0)}`}
                trend={pctChange(latestWeek.arrEnd, prevWeek?.arrEnd)}
                colorScheme="account"
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                {selectedStartup === "all" ? "ARR consolid\u00E9 par startup" : `\u00C9volution ARR \u2014 ${selectedStartup}`}
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                {selectedStartup === "all" ? (
                  <AreaChart data={arrByStartup}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => formatEuro(v)} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => formatEuro(v)} />
                    <Legend />
                    {startups.map((s, i) => (
                      <Area key={s} type="monotone" dataKey={s} stackId="1" fill={COLORS[i % COLORS.length]} stroke={COLORS[i % COLORS.length]} fillOpacity={0.6} />
                    ))}
                  </AreaChart>
                ) : (
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => formatEuro(v)} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => formatEuro(v)} />
                    <Legend />
                    <Area type="monotone" dataKey="projectedARR" name="ARR projet\u00E9" fill="#c7d2fe" stroke="#818cf8" fillOpacity={0.3} />
                    <Line type="monotone" dataKey="arrEnd" name="ARR r\u00E9el" stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ═══ 1. LEAD GENERATION ═══ */}
        {activeSection === "leadgen" && (
          <>
            <SectionHeader number={1} title="Lead Generation" source="Lemlist" colorScheme="leadGen" />
            {latestWeek && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Leads contact\u00E9s" value={latestWeek.leadsContacted || 0} trend={pctChange(latestWeek.leadsContacted, prevWeek?.leadsContacted)} colorScheme="leadGen" />
                <MetricCard label="R\u00E9ponses re\u00E7ues" value={latestWeek.repliesReceived || 0} trend={pctChange(latestWeek.repliesReceived, prevWeek?.repliesReceived)} colorScheme="leadGen" />
                <MetricCard label="Meetings book\u00E9s" value={latestWeek.meetingsBooked || 0} trend={pctChange(latestWeek.meetingsBooked, prevWeek?.meetingsBooked)} colorScheme="leadGen" />
                <MetricCard
                  label="Taux de r\u00E9ponse"
                  value={replyRate != null ? `${replyRate.toFixed(1)}%` : "\u2014"}
                  trend={replyRate != null && prevWeek?.leadsContacted ? delta(replyRate, (prevWeek.repliesReceived / prevWeek.leadsContacted) * 100) : undefined}
                  colorScheme="leadGen"
                />
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-base font-semibold text-gray-800 mb-4">Funnel outreach cette semaine</h3>
                <OutreachFunnel data={latestWeekData} />
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-base font-semibold text-gray-800 mb-4">Volume de contact par semaine</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="leadsContacted" name="Contact\u00E9s" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="repliesReceived" name="R\u00E9ponses" fill="#818cf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="meetingsBooked" name="Meetings" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-base font-semibold text-gray-800 mb-4">Taux de r\u00E9ponse (\u00E9volution)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData.map((d: any) => ({
                  ...d,
                  replyRate: d.leadsContacted > 0 ? ((d.repliesReceived || 0) / d.leadsContacted * 100) : 0,
                  bookingRate: d.repliesReceived > 0 ? ((d.meetingsBooked || 0) / d.repliesReceived * 100) : 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Legend />
                  <Line type="monotone" dataKey="replyRate" name="Taux r\u00E9ponse" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="bookingRate" name="R\u00E9ponse \u2192 Meeting" stroke="#a78bfa" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ═══ 2. PRODUCT-LED GROWTH ═══ */}
        {activeSection === "plg" && hasProductData && (
          <>
            <SectionHeader number={2} title="Product-Led Growth" source="PostHog" colorScheme="plg" />
            {latestWeek && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard label="WAU" value={latestWeek.wau || 0} trend={pctChange(latestWeek.wau, prevWeek?.wau)} colorScheme="plg" />
                <MetricCard label="Nouveaux signups" value={latestWeek.newSignups || 0} trend={pctChange(latestWeek.newSignups, prevWeek?.newSignups)} colorScheme="plg" />
                <MetricCard
                  label="Signup \u2192 Active"
                  value={latestWeek.newSignups && latestWeek.wau ? `${((latestWeek.newSignups / latestWeek.wau) * 100).toFixed(0)}%` : "\u2014"}
                  subtext="Part des nouveaux dans les actifs"
                  colorScheme="plg"
                />
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-base font-semibold text-gray-800 mb-4">WAU (\u00E9volution)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={chartData.filter((d: any) => d.wau != null)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="wau" name="WAU" fill="#ddd6fe" stroke="#8b5cf6" fillOpacity={0.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-base font-semibold text-gray-800 mb-4">Nouveaux signups par semaine</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData.filter((d: any) => d.newSignups != null)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="newSignups" name="Signups" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* ═══ 3. SALES PERFORMANCE ═══ */}
        {activeSection === "sales" && (
          <>
            <SectionHeader number={3} title="Sales Performance" source="CRM" colorScheme="sales" />
            {latestWeek && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Qualifications" value={latestWeek.qualificationsHeld || 0} trend={pctChange(latestWeek.qualificationsHeld, prevWeek?.qualificationsHeld)} colorScheme="sales" />
                <MetricCard label="Offres envoy\u00E9es" value={latestWeek.offersSent || 0} trend={pctChange(latestWeek.offersSent, prevWeek?.offersSent)} colorScheme="sales" />
                <MetricCard label="Nouveaux clients" value={latestWeek.newCustomers || 0} trend={pctChange(latestWeek.newCustomers, prevWeek?.newCustomers)} colorScheme="sales" />
                <MetricCard label="Nouvel ARR" value={formatEuro(latestWeek.newARR || 0)} trend={pctChange(latestWeek.newARR, prevWeek?.newARR)} colorScheme="sales" />
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-base font-semibold text-gray-800 mb-4">Funnel sales cette semaine</h3>
                <SalesFunnel data={latestWeekData} />
              </div>
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-base font-semibold text-gray-800 mb-4">Activit\u00E9 pipeline par semaine</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="qualificationsHeld" name="Qualifs" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="offersSent" name="Offres" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="newCustomers" name="Clients" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-base font-semibold text-gray-800 mb-4">Nouvel ARR sign\u00E9 + ARR projet\u00E9</h3>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => formatEuro(v)} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatEuro(v)} />
                  <Legend />
                  <Bar dataKey="newARR" name="Nouvel ARR" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="projectedARR" name="ARR projet\u00E9" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ═══ 4. ACCOUNT MANAGEMENT ═══ */}
        {activeSection === "account" && (
          <>
            <SectionHeader number={4} title="Account Management" source="Stripe + CRM" colorScheme="account" />
            {latestWeek && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <MetricCard label="Clients actifs" value={latestWeek.totalCustomers || 0} trend={pctChange(latestWeek.totalCustomers, prevWeek?.totalCustomers)} colorScheme="account" />
                <MetricCard label="ARR fin de semaine" value={formatEuro(latestWeek.arrEnd || 0)} trend={pctChange(latestWeek.arrEnd, prevWeek?.arrEnd)} colorScheme="account" />
                <MetricCard
                  label="Churn"
                  value={`${latestWeek.customersChurned || 0} client${(latestWeek.customersChurned || 0) > 1 ? "s" : ""}`}
                  subtext={latestWeek.arrLost > 0 ? `-${formatEuro(latestWeek.arrLost)} ARR` : undefined}
                  colorScheme={latestWeek.customersChurned > 0 ? "sales" : "account"}
                />
                <MetricCard label="Upsell / Expansion" value={formatEuro(latestWeek.upsellARR || 0)} trend={pctChange(latestWeek.upsellARR, prevWeek?.upsellARR)} colorScheme="account" />
                <MetricCard
                  label="NRR indicatif"
                  value={nrr != null ? `${nrr.toFixed(0)}%` : "\u2014"}
                  subtext={nrr != null && nrr >= 100 ? "Expansion nette" : nrr != null ? "Contraction nette" : undefined}
                  colorScheme={nrr != null && nrr >= 100 ? "account" : "sales"}
                />
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-base font-semibold text-gray-800 mb-4">\u00C9volution ARR</h3>
                <ResponsiveContainer width="100%" height={280}>
                  {selectedStartup === "all" ? (
                    <AreaChart data={arrByStartup}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => formatEuro(v)} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => formatEuro(v)} />
                      <Legend />
                      {startups.map((s, i) => (
                        <Area key={s} type="monotone" dataKey={s} stackId="1" fill={COLORS[i % COLORS.length]} stroke={COLORS[i % COLORS.length]} fillOpacity={0.6} />
                      ))}
                    </AreaChart>
                  ) : (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => formatEuro(v)} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => formatEuro(v)} />
                      <Legend />
                      <Line type="monotone" dataKey="arrEnd" name="ARR" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-base font-semibold text-gray-800 mb-4">Churn vs Expansion par semaine</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => formatEuro(v)} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => formatEuro(v)} />
                    <Legend />
                    <Bar dataKey="upsellARR" name="Upsell" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="arrLost" name="Churn ARR" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-base font-semibold text-gray-800 mb-4">Clients actifs (\u00E9volution)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="totalCustomers" name="Clients actifs" fill="#d1fae5" stroke="#10b981" fillOpacity={0.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {/* ═══ DATA TABLE ═══ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">D\u00E9tail par semaine</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {selectedStartup === "all" && <th className="px-3 py-3 text-left font-medium text-gray-500">Startup</th>}
                  <th className="px-3 py-3 text-left font-medium text-gray-500">Semaine</th>
                  <th className="px-3 py-3 text-right font-medium text-indigo-500">Contact\u00E9s</th>
                  <th className="px-3 py-3 text-right font-medium text-indigo-500">R\u00E9ponses</th>
                  <th className="px-3 py-3 text-right font-medium text-amber-500">Qualifs</th>
                  <th className="px-3 py-3 text-right font-medium text-amber-500">Offres</th>
                  <th className="px-3 py-3 text-right font-medium text-amber-500">Clients</th>
                  <th className="px-3 py-3 text-right font-medium text-emerald-500">ARR fin</th>
                  <th className="px-3 py-3 text-right font-medium text-emerald-500">Projet\u00E9</th>
                  <th className="px-3 py-3 text-right font-medium text-emerald-500">Upsell</th>
                  <th className="px-3 py-3 text-right font-medium text-red-400">Churn</th>
                  {hasProductData && <th className="px-3 py-3 text-right font-medium text-purple-500">WAU</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData
                  .sort((a, b) => b.week.localeCompare(a.week) || (a.startup || "").localeCompare(b.startup || ""))
                  .map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      {selectedStartup === "all" && <td className="px-3 py-3 font-medium text-gray-800">{row.startup}</td>}
                      <td className="px-3 py-3 text-gray-600">{formatWeek(row.week)}</td>
                      <td className="px-3 py-3 text-right">{row.leadsContacted}</td>
                      <td className="px-3 py-3 text-right">{row.repliesReceived}</td>
                      <td className="px-3 py-3 text-right">{row.qualificationsHeld}</td>
                      <td className="px-3 py-3 text-right">{row.offersSent}</td>
                      <td className="px-3 py-3 text-right">{row.newCustomers}</td>
                      <td className="px-3 py-3 text-right font-medium">{formatEuro(row.arrEnd)}</td>
                      <td className="px-3 py-3 text-right text-gray-400">{formatEuro(row.projectedARR)}</td>
                      <td className="px-3 py-3 text-right text-emerald-600">{row.upsellARR > 0 ? `+${formatEuro(row.upsellARR)}` : "\u2014"}</td>
                      <td className="px-3 py-3 text-right text-red-500">{row.arrLost > 0 ? `-${formatEuro(row.arrLost)}` : "\u2014"}</td>
                      {hasProductData && <td className="px-3 py-3 text-right">{row.wau != null ? row.wau : "\u2014"}</td>}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 py-4">
          Hexa GTM Dashboard \u2014 Donn\u00E9es mises \u00E0 jour via GitHub \u2022 Auto-refresh toutes les 5 min
        </div>
      </div>
    </div>
  );
}
