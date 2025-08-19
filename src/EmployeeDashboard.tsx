import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Download,
  Moon,
  Sun,
  Shield,
  LogIn,
  LogOut,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

/***********************
 * Employee Dashboard
 * – Fully in one file for learning
 * – TypeScript-first with enums, interfaces, guards, generics
 * – LocalStorage persistence
 * – Search, filter, sort, CRUD
 * – Summary charts
 * – Dark mode + simple auth (admin vs viewer)
 ***********************/

/**************
 * Types & Enums
 **************/
export enum Department {
  Engineering = "Engineering",
  HR = "HR",
  Sales = "Sales",
  Marketing = "Marketing",
  Finance = "Finance",
  Operations = "Operations",
}

export enum Role {
  Engineer = "Engineer",
  SeniorEngineer = "Senior Engineer",
  Manager = "Manager",
  HRManager = "HR Manager",
  Recruiter = "Recruiter",
  SalesRep = "Sales Rep",
  Marketer = "Marketer",
  Accountant = "Accountant",
  OperationsAnalyst = "Operations Analyst",
}

export enum Status {
  Active = "Active",
  Probation = "Probation",
  OnLeave = "On Leave",
  Inactive = "Inactive",
}

export enum ContractType {
  Permanent = "Permanent",
  Contract = "Contract",
  Intern = "Intern",
}

// Demonstrate intersection types for contact info
interface PhoneEmail {
  phone: string;
  email: string;
}
interface EmergencyContact {
  emergencyName: string;
  emergencyPhone: string;
}
export type ContactInfo = PhoneEmail & EmergencyContact; // intersection example

export interface EmployeeBase {
  name: string;
  employeeId: string; // unique code shown to users
  department: Department;
  role: Role;
  supervisor?: string;
  status: Status;
  contractType: ContractType;
  hireDate: string; // ISO date string
  contact: ContactInfo;
  photoUrl?: string; // URL or base64
}

export interface Employee extends EmployeeBase {
  id: string; // internal GUID
}

// Type guard example
export const isEmployee = (obj: unknown): obj is Employee => {
  if (!obj || typeof obj !== "object") return false;
  const e = obj as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.name === "string" &&
    typeof e.employeeId === "string" &&
    typeof e.department === "string" &&
    typeof e.role === "string" &&
    typeof e.status === "string" &&
    typeof e.contractType === "string" &&
    typeof e.hireDate === "string" &&
    typeof e.contact === "object"
  );
};

/**************
 * Utilities
 **************/
// Generic sorter
function sortByKey<T, K extends keyof T>(arr: T[], key: K, dir: "asc" | "desc" = "asc"): T[] {
  const sorted = [...arr].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (va === vb) return 0;
    if (typeof va === "string" && typeof vb === "string") {
      return va.localeCompare(vb);
    }
    // Fallback
    return (va as any) > (vb as any) ? 1 : -1;
  });
  return dir === "asc" ? sorted : sorted.reverse();
}

const LS_KEYS = {
  employees: "uptick.employees",
  theme: "uptick.theme",
  role: "uptick.role",
} as const;

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function saveJSON<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    if (!s) return fallback;
    const parsed = JSON.parse(s);
    return parsed as T;
  } catch {
    return fallback;
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString();
}

function daysBetween(aIso: string, bIso: string) {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function toCSV(rows: Record<string, string | number | undefined>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  return csv;
}

/**************
 * Demo seed data
 **************/
const SEED: Employee[] = [
  {
    id: uid(),
    name: "Odesomi Kamorudeen",
    employeeId: "EMP-001",
    department: Department.Engineering,
    role: Role.Engineer,
    supervisor: "Sam Carter",
    status: Status.Active,
    contractType: ContractType.Permanent,
    hireDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(), // 20 days ago
    contact: {
      phone: "+2347069411772",
      email: "kodesomi93@gmail.com",
      emergencyName: "kodesomi",
      emergencyPhone: "+2348022347871",
    },
    photoUrl: "https://i.pravatar.cc/100?img=1",
  },
  {
    id: uid(),
    name: "Bolagbade Latunde",
    employeeId: "EMP-002",
    department: Department.HR,
    role: Role.HRManager,
    supervisor: "—",
    status: Status.Active,
    contractType: ContractType.Permanent,
    hireDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
    contact: {
      phone: "+234706884221",
      email: "latunde_2@gmail.com",
      emergencyName: "Lilly Chen",
      emergencyPhone: "+23493445678",
    },
    photoUrl: "https://i.pravatar.cc/100?img=5",
  },
  {
    id: uid(),
    name: "Zara Bello",
    employeeId: "EMP-003",
    department: Department.Marketing,
    role: Role.Marketer,
    supervisor: "Michael Chen",
    status: Status.Probation,
    contractType: ContractType.Contract,
    hireDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    contact: {
      phone: "+234-701-0000",
      email: "zarab@gmail.com",
      emergencyName: "Faruq Bello",
      emergencyPhone: "+23420234461",
    },
    photoUrl: "https://i.pravatar.cc/100?img=8",
  },
];

/**************
 * Main Component
 **************/
export default function EmployeeDashboard() {
  // Theme
  const [dark, setDark] = useState(loadJSON<boolean>(LS_KEYS.theme, true));
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    saveJSON(LS_KEYS.theme, dark);
  }, [dark]);

  // Simple auth: admin can CRUD; viewer is read-only
  type UserRole = "admin" | "viewer";
  const [userRole, setUserRole] = useState<UserRole>(loadJSON<UserRole>(LS_KEYS.role, "admin"));
  useEffect(() => saveJSON(LS_KEYS.role, userRole), [userRole]);

  // Data
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const cached = loadJSON<Employee[]>(LS_KEYS.employees, []);
    if (cached.length) return cached.filter(isEmployee);
    saveJSON(LS_KEYS.employees, SEED);
    return SEED;
  });
  useEffect(() => saveJSON(LS_KEYS.employees, employees), [employees]);

  // Filters & search & sort
  const [q, setQ] = useState("");
  const [fDept, setFDept] = useState<string>("All");
  const [fRole, setFRole] = useState<string>("All");
  const [fStatus, setFStatus] = useState<string>("All");
  const [fContract, setFContract] = useState<string>("All");
  const [sortKey, setSortKey] = useState<keyof Employee>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    let rows = [...employees];
    if (q.trim()) {
      const s = q.toLowerCase();
      rows = rows.filter((e) =>
        [e.name, e.employeeId, e.contact.email].some((v) => v.toLowerCase().includes(s))
      );
    }
    if (fDept !== "All") rows = rows.filter((e) => e.department === fDept);
    if (fRole !== "All") rows = rows.filter((e) => e.role === fRole);
    if (fStatus !== "All") rows = rows.filter((e) => e.status === fStatus);
    if (fContract !== "All") rows = rows.filter((e) => e.contractType === fContract);

    // Custom sort: if sorting by hireDate
    if (sortKey === "hireDate") {
      rows = [...rows].sort((a, b) => (a.hireDate > b.hireDate ? 1 : -1));
      if (sortDir === "desc") rows.reverse();
      return rows;
    }
    return sortByKey(rows, sortKey, sortDir);
  }, [employees, q, fDept, fRole, fStatus, fContract, sortKey, sortDir]);

  // Metrics
  const total = employees.length;
  const byDept = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of employees) map[e.department] = (map[e.department] || 0) + 1;
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [employees]);
  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of employees) map[e.status] = (map[e.status] || 0) + 1;
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [employees]);
  const newlyHired = employees.filter((e) => daysBetween(e.hireDate, new Date().toISOString()) <= 30).length;
  const onProbation = employees.filter((e) => e.status === Status.Probation).length;

  // CRUD form state
  const emptyForm: EmployeeBase = {
    name: "",
    employeeId: "",
    department: Department.Engineering,
    role: Role.Engineer,
    supervisor: "",
    status: Status.Active,
    contractType: ContractType.Permanent,
    hireDate: new Date().toISOString().slice(0, 10), // yyyy-mm-dd
    contact: {
      phone: "",
      email: "",
      emergencyName: "",
      emergencyPhone: "",
    },
    photoUrl: "",
  };

  const [form, setForm] = useState<EmployeeBase>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const canEdit = userRole === "admin";

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm);
  }
  function startEdit(id: string) {
    const e = employees.find((x) => x.id === id);
    if (!e) return;
    setEditingId(id);
    setForm({ ...e });
  }
  function remove(id: string) {
    if (!canEdit) return;
    if (confirm("Delete this employee?")) {
      setEmployees((prev) => prev.filter((x) => x.id !== id));
    }
  }

  function upsert(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    // very light validation
    if (!form.name || !form.employeeId || !form.contact.email) {
      alert("Please fill name, employee ID and email.");
      return;
    }
    if (editingId) {
      setEmployees((prev) => prev.map((x) => (x.id === editingId ? { ...x, ...form } : x)));
    } else {
      const newE: Employee = { id: uid(), ...form };
      setEmployees((prev) => [newE, ...prev]);
    }
    setEditingId(null);
    setForm(emptyForm);
  }

  // Export
  function exportJSON() {
    const blob = new Blob([JSON.stringify(employees, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  function exportCSV() {
    const rows = employees.map((e) => ({
      id: e.id,
      name: e.name,
      employeeId: e.employeeId,
      department: e.department,
      role: e.role,
      supervisor: e.supervisor ?? "",
      status: e.status,
      contractType: e.contractType,
      hireDate: e.hireDate,
      email: e.contact.email,
      phone: e.contact.phone,
      emergencyName: e.contact.emergencyName,
      emergencyPhone: e.contact.emergencyPhone,
      photoUrl: e.photoUrl ?? "",
    }));
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // UI helpers
  const badge = (text: string) => (
    <span className="px-2 py-1 text-xs rounded-full border border-zinc-300 dark:border-zinc-700">{text}</span>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur bg-white/60 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6" />
            <h1 className="text-xl font-semibold">Uptick – Employee Management</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">TypeScript</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded-xl overflow-hidden">
              <button
                className={`px-3 py-1.5 ${userRole === "viewer" ? "bg-zinc-200 dark:bg-zinc-800" : ""}`}
                onClick={() => setUserRole("viewer")}
                title="Viewer (read-only)"
              >
                <LogIn className="w-4 h-4 inline mr-1" /> Viewer
              </button>
              <button
                className={`px-3 py-1.5 ${userRole === "admin" ? "bg-zinc-200 dark:bg-zinc-800" : ""}`}
                onClick={() => setUserRole("admin")}
                title="Admin (can edit)"
              >
                <LogOut className="w-4 h-4 inline mr-1" /> Admin
              </button>
            </div>
            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => setDark((d) => !d)}
              title="Toggle dark mode"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}<span className="text-sm">Theme</span>
            </button>
            <button
              onClick={exportJSON}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Export JSON"
            >
              <Download className="w-4 h-4" /> JSON
            </button>
            <button
              onClick={exportCSV}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Export CSV"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Dashboard + Table */}
        <div className="lg:col-span-3 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard title="Total" value={total} />
            <StatCard title="Probation" value={onProbation} />
            <StatCard title="New (30d)" value={newlyHired} />
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3">
              <h3 className="text-sm mb-2 font-medium">By Status</h3>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={45}>
                      {byStatus.map((_, i) => (
                        <Cell key={i} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-2 top-2.5 text-zinc-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, ID, or email"
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none"
                />
              </div>
              <SortPicker
                sortKey={sortKey}
                sortDir={sortDir}
                onChange={(k, d) => {
                  setSortKey(k);
                  setSortDir(d);
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={fDept} onChange={setFDept} label="Dept" options={["All", ...Object.values(Department)]} />
              <Select value={fRole} onChange={setFRole} label="Role" options={["All", ...Object.values(Role)]} />
              <Select value={fStatus} onChange={setFStatus} label="Status" options={["All", ...Object.values(Status)]} />
              <Select value={fContract} onChange={setFContract} label="Contract" options={["All", ...Object.values(ContractType)]} />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-100 dark:bg-zinc-900/60">
                <tr className="text-left">
                  <Th label="Name" />
                  <Th label="ID" />
                  <Th label="Dept" />
                  <Th label="Role" />
                  <Th label="Status" />
                  <Th label="Contract" />
                  <Th label="Hire Date" />
                  <Th label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {e.photoUrl ? (
                          <img src={e.photoUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                        )}
                        <div>
                          <div className="font-medium">{e.name}</div>
                          <div className="text-xs text-zinc-500">{e.contact.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{badge(e.employeeId)}</td>
                    <td className="p-3">{e.department}</td>
                    <td className="p-3">{e.role}</td>
                    <td className="p-3">{e.status}</td>
                    <td className="p-3">{e.contractType}</td>
                    <td className="p-3">{formatDate(e.hireDate)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button
                          disabled={!canEdit}
                          onClick={() => startEdit(e.id)}
                          className="p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          disabled={!canEdit}
                          onClick={() => remove(e.id)}
                          className="p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-zinc-500">
                      No employees match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Editor */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sticky top-20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{editingId ? "Edit Employee" : "Add Employee"}</h3>
              <button
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={startAdd}
              >
                <Plus className="w-4 h-4" /> New
              </button>
            </div>
            {!canEdit && (
              <div className="text-xs mb-3 p-2 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30">
                You are in <b>viewer</b> mode. Switch to Admin to make changes.
              </div>
            )}
            <form onSubmit={upsert} className="space-y-3">
              <Text label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Text label="Employee ID" value={form.employeeId} onChange={(v) => setForm({ ...form, employeeId: v })} />
              <Select label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v as Department })} options={Object.values(Department)} />
              <Select label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v as Role })} options={Object.values(Role)} />
              <Text label="Supervisor" value={form.supervisor || ""} onChange={(v) => setForm({ ...form, supervisor: v })} />
              <Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v as Status })} options={Object.values(Status)} />
              <Select label="Contract Type" value={form.contractType} onChange={(v) => setForm({ ...form, contractType: v as ContractType })} options={Object.values(ContractType)} />
              <DateInput label="Hire Date" value={form.hireDate.slice(0, 10)} onChange={(v) => setForm({ ...form, hireDate: v })} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Text label="Email" value={form.contact.email} onChange={(v) => setForm({ ...form, contact: { ...form.contact, email: v } })} />
                <Text label="Phone" value={form.contact.phone} onChange={(v) => setForm({ ...form, contact: { ...form.contact, phone: v } })} />
                <Text label="Emergency Name" value={form.contact.emergencyName} onChange={(v) => setForm({ ...form, contact: { ...form.contact, emergencyName: v } })} />
                <Text label="Emergency Phone" value={form.contact.emergencyPhone} onChange={(v) => setForm({ ...form, contact: { ...form.contact, emergencyPhone: v } })} />
              </div>

              <Text label="Photo URL (optional)" value={form.photoUrl || ""} onChange={(v) => setForm({ ...form, photoUrl: v })} />

              <button
                type="submit"
                disabled={!canEdit}
                className="w-full inline-flex justify-center items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 disabled:opacity-50"
              >
                {editingId ? "Update" : "Add"}
              </button>
            </form>
          </div>

          {/* Department chart */}
          <div className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <h3 className="font-semibold mb-2">By Department</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byDept} dataKey="value" nameKey="name" innerRadius={35} outerRadius={60}>
                    {byDept.map((_, i) => (
                      <Cell key={i} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <footer className="max-w-7xl mx-auto px-4 pb-8 text-xs text-zinc-500">
        Built with React + TypeScript • LocalStorage persistence • Exports JSON/CSV • Dark mode • Simple auth
      </footer>
    </div>
  );
}

/**************
 * Small UI bits
 **************/
function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3"
    >
      <div className="text-sm text-zinc-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </motion.div>
  );
}

function Th({ label }: { label: string }) {
  return <th className="p-3 text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</th>;
}

function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-xs text-zinc-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none"
      />
    </label>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-xs text-zinc-500">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="text-sm">
      <span className="text-xs text-zinc-500 mr-2">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function SortPicker({
  sortKey,
  sortDir,
  onChange,
}: {
  sortKey: keyof Employee;
  sortDir: "asc" | "desc";
  onChange: (k: keyof Employee, d: "asc" | "desc") => void;
}) {
  const keys: (keyof Employee)[] = ["name", "hireDate", "employeeId"];
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="hidden sm:inline text-zinc-500"><FilterIcon /> Sort</span>
      <select
        className="px-2 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
        value={String(sortKey)}
        onChange={(e) => onChange(e.target.value as keyof Employee, sortDir)}
      >
        {keys.map((k) => (
          <option key={String(k)} value={String(k)}>
            {String(k)}
          </option>
        ))}
      </select>
      <select
        className="px-2 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
        value={sortDir}
        onChange={(e) => onChange(sortKey, e.target.value as any)}
      >
        <option value="asc">asc</option>
        <option value="desc">desc</option>
      </select>
    </div>
  );
}

function FilterIcon() {
  return <span className="inline-flex items-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 18h4v-2h-4v2zm-7-8v2h18v-2H3zm3-6v2h12V4H6z"/></svg></span>;
}
