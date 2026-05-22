"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import { adminStack } from "./admin-ui";

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
    <div className={adminStack}>
      <div>
        <h1 className="ella-heading-page">Audit log</h1>
        <p className="ella-text-muted mt-1">
          Who created users, sites, and sessions — for accountability.
        </p>
      </div>

      <div className="ella-table-wrap">
        <table className="ella-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-[var(--ella-fg-subtle)]">
                  Loading…
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-[var(--ella-fg-subtle)]">
                  No audit entries yet.
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="ella-table-primary">
                    {l.actorName}
                    <span className="block font-mono text-xs font-normal text-[var(--ella-fg-subtle)]">
                      {l.actorEmployeeId}
                    </span>
                  </td>
                  <td className="ella-table-primary">
                    {l.action}
                    {l.detail ? (
                      <span className="block text-xs font-normal text-[var(--ella-fg-subtle)]">
                        {l.detail}
                      </span>
                    ) : null}
                  </td>
                  <td>
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
