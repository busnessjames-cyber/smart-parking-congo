"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Search, RotateCcw } from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
}

interface PaginatedResponse {
  logs: AuditEntry[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

const ACTIONS = [
  { value: "LOGIN", label: "LOGIN" },
  { value: "LOGOUT", label: "LOGOUT" },
  { value: "CREATE_TICKET", label: "CREATE_TICKET" },
  { value: "AUTHORIZE_EXIT", label: "AUTHORIZE_EXIT" },
  { value: "CREATE_PAYMENT", label: "CREATE_PAYMENT" },
  { value: "UPDATE_RATE", label: "UPDATE_RATE" },
  { value: "CREATE_USER", label: "CREATE_USER" },
  { value: "UPDATE_USER", label: "UPDATE_USER" },
  { value: "DELETE_USER", label: "DELETE_USER" },
  { value: "CREATE_PARKING", label: "CREATE_PARKING" },
  { value: "UPDATE_PARKING", label: "UPDATE_PARKING" },
  { value: "UPDATE_SETTINGS", label: "UPDATE_SETTINGS" },
];

export default function AuditPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "50");
    if (actionFilter) params.set("action", actionFilter);
    return params;
  }, [page, actionFilter]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/audit?${buildParams()}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [buildParams]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Audit Log</h1>
      </div>

      <Card className="mb-6">
        <div className="flex gap-4">
          <Select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            options={ACTIONS}
            placeholder="Toutes les actions"
            className="w-64"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setActionFilter(""); setPage(1); }}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Réinitialiser
          </Button>
        </div>
      </Card>

      {loading ? (
        <TableSkeleton rows={10} cols={4} />
      ) : data && data.logs.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Utilisateur</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Entité</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.logs.map((log) => {
                  let details = null;
                  try {
                    if (log.details) details = JSON.parse(log.details);
                  } catch { /* ignore */ }
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {log.user.firstName} {log.user.lastName}
                        </span>
                        <span className="block text-xs text-gray-400">{log.user.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-mono dark:bg-gray-700 dark:text-gray-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {log.entityType ? `${log.entityType} #${log.entityId?.slice(0, 8)}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500 max-w-[200px] truncate">
                        {details ? JSON.stringify(details).slice(0, 60) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            onPageChange={setPage}
          />
        </>
      ) : (
        <Card>
          <p className="text-center text-gray-500">Aucun log trouvé</p>
        </Card>
      )}
    </div>
  );
}
