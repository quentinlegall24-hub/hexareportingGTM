"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ComposedChart,
} from "recharts";

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

/* ── Methodology metadata ── */
const METHODOLOGY: Record<string, { label: string; shortDesc: string; details: string; source: string }> = {
  leadsGenerated: {
    label: "Leads g\u00e9n\u00e9r\u00e9s",
    shortDesc: "Nombre de leads contact\u00e9s dans la semaine",
    details: "Panora : \u00ab leads contact\u00e9s \u00bb report\u00e9s dans la page Weekly Sales Notion. Avant mars, estim\u00e9 d\u2019apr\u00e8s les mentions qualitatives (30-40/sem nov-d\u00e9c, mont\u00e9e \u00e0 60-70 en f\u00e9vrier, puis chiffres exacts en mars).\nPlato : volume plus faible (march\u00e9 niche avocats), reconstitu\u00e9 \u00e0 partir des entr\u00e9es CRM et Slack.",
    source: "Weekly Sales Notion + CRM Notion + Slack",
  },
  qualificationsHeld: {
    label: "Qualifications",
    shortDesc: "Nombre de d\u00e9mos/qualifications tenues",
    details: "Panora : \u00ab demos booked \u00bb dans les tableaux Weekly Sales. Mars : 17 (W03), 22 (W10), 11 (W17), 7 (W24). Avant mars : estim\u00e9 proportionnellement \u00e0 la croissance (3-5/sem nov-d\u00e9c, 4-6 en janvier, 8-12 en f\u00e9vrier).\nPlato : bas\u00e9 sur les qualifications CRM (entr\u00e9es en stage \u00ab Qualif \u00bb).",
    source: "Weekly Sales Notion + CRM Plato",
  },
  offersSent: {
    label: "Offres envoy\u00e9es",
    shortDesc: "Nombre de propositions/offres envoy\u00e9es",
    details: "Correspond aux prospects pass\u00e9s en stage \u00ab Hot discussions \u00bb / \u00ab Free Trial \u00bb dans le CRM Panora, et aux offres formalis\u00e9es pour Plato. Estim\u00e9 \u00e0 partir du ratio qualif \u2192 offre observ\u00e9 (~40-50%).",
    source: "CRM Brokers Notion + CRM Plato Notion",
  },
  newCustomers: {
    label: "Nouveaux clients",
    shortDesc: "Design Partners / clients onboard\u00e9s cette semaine",
    details: "Panora : \u00ab clients onboarded \u00bb de la Weekly Sales. Progression cumulative des \u00ab To date \u00bb sections : 1 DP (CEGEAS) en W48 nov \u2192 5 fin d\u00e9c \u2192 plateau jan \u2192 reprise \u00e0 6 en W19/01, acc\u00e9l\u00e9ration \u00e0 30 en W24/03.\nPlato : chaque avocat sign\u00e9 avec Deal Size dans le CRM (ex: Roman Leibovici, Closed Won 12/03/2026).",
    source: "Weekly Sales Notion + CRM Brokers + CRM Plato (Closed Won)",
  },
  arrEnd: {
    label: "ARR actuel",
    shortDesc: "ARR cumul\u00e9 en fin de semaine",
    details: "Panora : pas de champ Deal Size dans le CRM. Estim\u00e9 \u00e0 ~3 600\u20ac/an par DP (pricing model : 150\u20ac/mois/agent/module \u00d7 2 modules en moyenne = 300\u20ac/mois = 3 600\u20ac/an). Formule : arrEnd = arrStart + (newCustomers \u00d7 3 600) - arrLost.\nPlato : champ Deal Size pr\u00e9sent dans le CRM (~450\u20ac/DP). Formule : arrEnd = arrStart + newARR - arrLost.\nConsolid\u00e9 = somme Panora + Plato.",
    source: "CRM Brokers (pricing model 150\u20ac/mth) + CRM Plato (Deal Size)",
  },
  projectedARR: {
    label: "ARR projet\u00e9",
    shortDesc: "ARR incluant le pipeline qualifi\u00e9",
    details: "Panora : inclut les top deals du \u00ab hustle board \u00bb Weekly Sales : Bess\u00e9 (120K\u20ac), Arilim (150K\u20ac), Suire (150K\u20ac), Val\u00e9as (60K\u20ac), etc. Total pipeline ~398-420K\u20ac en mars.\nPlato : bas\u00e9 sur le pipeline visible dans le CRM (prospects en Qualif \u00d7 deal size moyen).\nAvant mars : estim\u00e9 \u00e0 partir du nombre de prospects en \u00ab Hot discussions \u00bb \u00d7 ARR moyen.",
    source: "Weekly Sales (hustle board) + CRM pipeline",
  },
  newARR: {
    label: "Nouvel ARR",
    shortDesc: "ARR additionnel g\u00e9n\u00e9r\u00e9 cette semaine",
    details: "Panora : newCustomers \u00d7 3 600\u20ac (estimation pricing model).\nPlato : newCustomers \u00d7 ~450\u20ac (Deal Size CRM), avec quelques variations (W17/02 : 1 000\u20ac, W03/03 : 1 630\u20ac pour 2 clients de valeurs diff\u00e9rentes).",
    source: "CRM Brokers (pricing) + CRM Plato (Deal Size)",
  },
  conversion: {
    label: "Taux de conversion",
    shortDesc: "Ratios entre \u00e9tapes du pipeline",
    details: "Calcul\u00e9 directement : Lead \u2192 Qualif = qualificationsHeld / leadsGenerated. Qualif \u2192 Offre = offersSent / qualificationsHeld. Offre \u2192 Client = newCustomers / offersSent. Bas\u00e9 sur les donn\u00e9es de la semaine en cours uniquement.",
    source: "Calcul automatique depuis les donn\u00e9es hebdomadaires",
  },
  customersLost: {
    label: "Churn",
    shortDesc: "Clients perdus et ARR associ\u00e9",
    details: "Panora W10/02 : 2 clients perdus (churn observ\u00e9 dans le CRM), arrLost = 7 200\u20ac.\nPlato W17/03 : 1 client perdu, arrLost = 450\u20ac.\nToutes les autres semaines : 0 churn.",
    source: "CRM Brokers + CRM Plato (changements de stage)",
  },
};

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

/* ── Info Tooltip component ── */
function InfoTooltip({ metricKey }: { metricKey: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const meta = METHODOLOGY[metricKey];
  if (!meta) return null;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative inline-block ml-1" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/50 hover:bg-white text-[10px] font-bold opacity-60 hover:opacity-100 transition-all cursor-pointer border border-current/20"
        title="Voir la m\u00e9thodologie"
      >
        i
      </button>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-gray-900 text-white rounded-lg shadow-xl p-3 text-xs leading-relaxed animate-fade-in">
          <div className="font-semibold text-indigo-300 mb-1">{meta.label}</div>
          <div className="text-gray-300 whitespace-pre-line">{meta.details}</div>
          <div className="mt-2 pt-2 border-t border-gray-700 text-gray-400">
            <span className="font-medium text-gray-300">Source :</span> {meta.source}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

/* ── Methodology Modal ── */
function MethodologyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">M\u00e9thodologie de calcul</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
        </div>
        <div className="px-6 py-4 space-y-5">
          {Object.entries(METHODOLOGY).map(([key, meta]) => (
            <div key={key} className="border-b border-gray-100 pb-4 last:border-0">
              <div className="font-semibold text-indigo-600 mb-1">{meta.label}</div>
              <div className="text-sm text-gray-600 whitespace-pre-line">{meta.details}</div>
              <div className="mt-1 text-xs text-gray-400">
                <span className="font-medium text-gray-500">Source :</span> {meta.source}
              </div>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-4 text-xs text-gray-400">
            <p className="font-medium text-gray-600 mb-1">Hypoth\u00e8ses cl\u00e9s</p>
            <p>\u2022 ARR Panora : estim\u00e9 \u00e0 3 600\u20ac/an par DP (pricing 150\u20ac/mois/module \u00d7 2 modules). Le CRM n\u2019a pas de champ Deal Size.</p>
            <p>\u2022 ARR Plato : ~450\u20ac/DP (champ Deal Size pr\u00e9sent dans le CRM).</p>
            <p>\u2022 Semaines avant mars : reconstitu\u00e9es \u00e0 partir des sections \u00ab To date \u00bb qualitatives de la Weekly Sales page.</p>
            <p>\u2022 Les donn\u00e9es de mars sont les plus fiables (tableaux structur\u00e9s Notion avec chiffres exacts).</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Enhanced Recharts Tooltip ── */
function ChartTooltipContent({ active, payload, label, metricKeys }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-gray-900 text-white rounded-lg shadow-xl p-3 text-xs max-w-xs">
      <div className="font-semibold text-indigo-300 mb-2 border-b border-gray-700 pb-1">{label}</div>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-300">{entry.name} :</span>
          <span className="font-semibold text-white">
            {typeof entry.value === "number" && entry.value >= 100 ? formatEuro(entry.value) : entry.value}
          </span>
        </div>
      ))}
      {metricKeys && metricKeys.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-700 text-gray-400">
          {metricKeys.map((k: string) => METHODOLOGY[k]?.shortDesc).filter(Boolean).slice(0, 2).map((desc: string, i: number) => (
            <div key={i} className="text-[10px]">{"\u2139\ufe0f"} {desc}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, subtext, trend, color = "indigo", metricKey }: {
  label: string; value: string | number; subtext?: string;
  trend?: number; color?: string; metricKey?: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    red: "bg-red-50 border-red-200 text-red-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };
  return (
    <div className={`rounded-xl border-2 p-4 ${colorMap[color] || colorMap.indigo} relative group`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70 flex items-center">
        {label}
        {metricKey && <InfoTooltip metricKey={metricKey} />}
      </div>
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
        <div key={stage.key} className="flex items-center gap-3 group relative">
          <div className="w-16 text-xs font-medium text-gray-500 text-right flex items-center justify-end gap-1">
            {stage.label}
            <InfoTooltip metricKey={stage.key} />
          </div>
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

function LoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Chargement des donn\u00e9es...</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">{"\ud83d\udcca"}</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Aucune donn\u00e9e pour le moment</h2>
        <p className="text-gray-500">
          Les donn\u00e9es appara\u00eetront ici d\u00e8s que les founders soumettront leur premier reporting hebdomadaire via Claude.
        </p>
      </div>
    </div>
  );
}

/* ── Table row tooltip ── */
function TableCellWithTooltip({ value, metricKey, isEuro = false }: { value: number; metricKey: string; isEuro?: boolean }) {
  const [hover, setHover] = useState(false);
  const meta = METHODOLOGY[metricKey];
  return (
    <td className="px-4 py-3 text-right relative"
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <span className={`${isEuro ? "font-medium" : ""} cursor-help border-b border-dotted border-gray-300`}>
        {isEuro ? formatEuro(value) : value}
      </span>
      {hover && meta && (
        <div className="absolute z-40 bottom-full right-0 mb-1 w-56 bg-gray-900 text-white rounded-lg shadow-xl p-2 text-[10px] leading-relaxed pointer-events-none">
          <div className="font-semibold text-indigo-300">{meta.shortDesc}</div>
          <div className="text-gray-400 mt-0.5">Source : {meta.source}</div>
          <div className="absolute top-full right-4 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-gray-900" />
        </div>
      )}
    </td>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStartup, setSelectedStartup] = useState("all");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showMethodology, setShowMethodology] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch("/data.json", { cache: "no-store" });
      if (res.ok) {
        const fresh = await res.json();
        if (Array.isArray(fresh)) {
          setData(fresh);
          setLastRefresh(new Date());
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const weeklyData = useMemo(() => data.filter((d) => d.type === "weekly"), [data]);
  const startups = useMemo(() => [...new Set(weeklyData.map((d) => d.startup))].sort(), [weeklyData]);
  const filteredData = useMemo(
    () => selectedStartup === "all" ? weeklyData : weeklyData.filter((d) => d.startup === selectedStartup),
    [selectedStartup, weeklyData]
  );

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
      return { ...d, week: formatWeek(w), rawWeek: w };
    });
  }, [filteredData, selectedStartup]);

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

  if (loading) return <LoadingState />;
  if (weeklyData.length === 0) return <EmptyState />;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <MethodologyModal isOpen={showMethodology} onClose={() => setShowMethodology(false)} />
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hexa GTM Dashboard</h1>
            <p className="text-gray-500 mt-1">
              Reporting commercial {"\u2014"} {startups.length} startup{startups.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMethodology(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all"
            >
              <span className="text-sm">&#x2139;&#xfe0f;</span> M\u00e9thodologie
            </button>
            <div className="text-right text-sm text-gray-400">
              Derni{"\u00e8"}re MAJ : {lastRefresh.toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>

        <StartupTabs startups={startups} selected={selectedStartup} onSelect={setSelectedStartup} />

        {latestWeek && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <MetricCard label="Leads g\u00e9n\u00e9r\u00e9s" value={latestWeek.leadsGenerated}
              trend={pctChange(latestWeek.leadsGenerated, previousWeek?.leadsGenerated)} color="indigo"
              metricKey="leadsGenerated" />
            <MetricCard label="Qualifications" value={latestWeek.qualificationsHeld}
              trend={pctChange(latestWeek.qualificationsHeld, previousWeek?.qualificationsHeld)} color="purple"
              metricKey="qualificationsHeld" />
            <MetricCard label="Offres envoy\u00e9es" value={latestWeek.offersSent}
              trend={pctChange(latestWeek.offersSent, previousWeek?.offersSent)} color="amber"
              metricKey="offersSent" />
            <MetricCard label="Nouveaux clients" value={latestWeek.newCustomers}
              trend={pctChange(latestWeek.newCustomers, previousWeek?.newCustomers)} color="green"
              metricKey="newCustomers" />
            <MetricCard label="ARR actuel" value={formatEuro(latestWeek.arrEnd || 0)}
              subtext={`Projet\u00e9: ${formatEuro(latestWeek.projectedARR || 0)}`}
              trend={pctChange(latestWeek.arrEnd, previousWeek?.arrEnd)} color="green"
              metricKey="arrEnd" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {selectedStartup === "all" ? "ARR consolid\u00e9 par startup" : `\u00c9volution ARR \u2014 ${selectedStartup}`}
              </h2>
              <InfoTooltip metricKey="arrEnd" />
            </div>
            <ResponsiveContainer width="100%" height={280}>
              {selectedStartup === "all" ? (
                <AreaChart data={arrByStartup}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={formatEuro} tick={{ fontSize: 12 }} />
                  <Tooltip content={<ChartTooltipContent metricKeys={["arrEnd"]} />} />
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
                  <Tooltip content={<ChartTooltipContent metricKeys={["arrEnd", "projectedARR"]} />} />
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
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                Conversion <InfoTooltip metricKey="conversion" />
              </div>
              {latestWeek && latestWeek.leadsGenerated > 0 && (
                <div className="space-y-1 text-sm text-gray-600">
                  <div>Lead {"\u2192"} Qualif: <span className="font-semibold">
                    {((latestWeek.qualificationsHeld / latestWeek.leadsGenerated) * 100).toFixed(0)}%</span></div>
                  <div>Qualif {"\u2192"} Offre: <span className="font-semibold">
                    {latestWeek.qualificationsHeld > 0 ? ((latestWeek.offersSent / latestWeek.qualificationsHeld) * 100).toFixed(0) : 0}%</span></div>
                  <div>Offre {"\u2192"} Client: <span className="font-semibold">
                    {latestWeek.offersSent > 0 ? ((latestWeek.newCustomers / latestWeek.offersSent) * 100).toFixed(0) : 0}%</span></div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Activit\u00e9 pipeline</h2>
              <InfoTooltip metricKey="leadsGenerated" />
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<ChartTooltipContent metricKeys={["leadsGenerated", "qualificationsHeld"]} />} />
                <Legend />
                <Bar dataKey="leadsGenerated" name="Leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="qualificationsHeld" name="Qualifs" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="offersSent" name="Offres" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="newCustomers" name="Clients" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Nouvel ARR par semaine</h2>
              <InfoTooltip metricKey="newARR" />
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatEuro} tick={{ fontSize: 12 }} />
                <Tooltip content={<ChartTooltipContent metricKeys={["newARR"]} />} />
                <Bar dataKey="newARR" name="Nouvel ARR" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">D\u00e9tail par semaine</h2>
            <p className="text-xs text-gray-400 mt-1">Survolez une cellule pour voir la source du chiffre</p>
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
                      <TableCellWithTooltip value={row.leadsGenerated} metricKey="leadsGenerated" />
                      <TableCellWithTooltip value={row.qualificationsHeld} metricKey="qualificationsHeld" />
                      <TableCellWithTooltip value={row.offersSent} metricKey="offersSent" />
                      <TableCellWithTooltip value={row.newCustomers} metricKey="newCustomers" />
                      <TableCellWithTooltip value={row.arrEnd} metricKey="arrEnd" isEuro />
                      <TableCellWithTooltip value={row.projectedARR} metricKey="projectedARR" isEuro />
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

        <div className="text-center text-xs text-gray-400 py-4">
          Hexa GTM Dashboard {"\u2014"} Donn\u00e9es mises \u00e0 jour via GitHub {"\u2022"} Auto-refresh toutes les 5 min
        </div>
      </div>
    </div>
  );
}
