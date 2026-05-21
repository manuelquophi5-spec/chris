"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";

type LogRow = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  detail?: string;
  actorName: string;
  actorEmployeeId: string;
  createdAt: string;
};

export function AdminAuditLog() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await authFetch("/api/admin/audit");
      const data = await res.json();
      if (res.ok) setLogs(data.logs ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Audit log</h1>
      <p className="mt-1 text-slate-600">
        Who created users, sites, and sessions — for accountability.
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-slate-500">
                  No audit entries yet.
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {l.actorName}
                    <span className="block font-mono text-xs text-slate-500">
                      {l.actorEmployeeId}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {l.action}
                    {l.detail ? (
                      <span className="block text-xs font-normal text-slate-500">
                        {l.detail}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {l.targetType} / {l.targetId.slice(-6)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
