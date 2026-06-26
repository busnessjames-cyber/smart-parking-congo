"use client";

import { useEffect, useState, useCallback } from "react";
import { VEHICLE_TYPE_LABELS } from "@/lib/permissions";
import { formatCurrency } from "@/lib/audit";
import { formatDateTime } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Search, RotateCcw } from "lucide-react";

interface Ticket {
  id: string;
  ticketNumber: string;
  plate: string;
  vehicleType: string;
  rateAmount: number;
  status: string;
  paymentStatus: string;
  entryDate: string;
  exitDate?: string;
  entryAgent: { firstName: string; lastName: string };
  exitAgent?: { firstName: string; lastName: string };
}

interface PaginatedResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

const STATUS_LABELS: Record<string, string> = { INSIDE: "Présent", CLOSED: "Terminé" };
const PAYMENT_LABELS: Record<string, string> = { PAID: "Payé", UNPAID: "Non payé" };

const statusBadge = (status: string) => {
  if (status === "INSIDE") return <Badge variant="info">{STATUS_LABELS[status]}</Badge>;
  return <Badge variant="default">{STATUS_LABELS[status] || status}</Badge>;
};

const paymentBadge = (status: string) => {
  if (status === "PAID") return <Badge variant="success">{PAYMENT_LABELS[status]}</Badge>;
  return <Badge variant="danger">{PAYMENT_LABELS[status] || status}</Badge>;
};

export default function TicketsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    paymentStatus: "",
    vehicleType: "",
    dateFrom: "",
    dateTo: "",
  });

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
    if (filters.vehicleType) params.set("vehicleType", filters.vehicleType);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    return params;
  }, [page, filters]);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets?${buildParams()}`);
      const json = await res.json();
      if (res.ok && json.tickets) {
        setData(json);
      } else {
        setData({ tickets: [], total: 0, page: 1, totalPages: 0, limit: 20 });
      }
    } catch {
      setData({ tickets: [], total: 0, page: 1, totalPages: 0, limit: 20 });
    }
    setLoading(false);
  }, [buildParams]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleReset = () => {
    setFilters({ search: "", status: "", paymentStatus: "", vehicleType: "", dateFrom: "", dateTo: "" });
    setPage(1);
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tickets</h1>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="grid gap-4 md:grid-cols-6">
          <Input
            placeholder="N° ticket ou plaque..."
            value={filters.search}
            onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
          />
          <Select
            value={filters.status}
            onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
            options={[
              { value: "INSIDE", label: "Présent" },
              { value: "CLOSED", label: "Terminé" },
            ]}
            placeholder="Statut"
          />
          <Select
            value={filters.paymentStatus}
            onChange={(e) => { setFilters({ ...filters, paymentStatus: e.target.value }); setPage(1); }}
            options={[
              { value: "PAID", label: "Payé" },
              { value: "UNPAID", label: "Non payé" },
            ]}
            placeholder="Paiement"
          />
          <Select
            value={filters.vehicleType}
            onChange={(e) => { setFilters({ ...filters, vehicleType: e.target.value }); setPage(1); }}
            options={[
              { value: "MOTO", label: "Moto" },
              { value: "VOITURE", label: "Voiture" },
              { value: "CAMION", label: "Camion" },
              { value: "BUS", label: "Bus" },
            ]}
            placeholder="Type véhicule"
          />
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => { setFilters({ ...filters, dateFrom: e.target.value }); setPage(1); }}
          />
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => { setFilters({ ...filters, dateTo: e.target.value }); setPage(1); }}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Réinitialiser
          </Button>
        </div>
      </Card>

      {loading ? (
        <TableSkeleton rows={10} cols={8} />
      ) : data && data.tickets.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">N° Ticket</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Plaque</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Tarif</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Entrée</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Sortie</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Agent</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Statut</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Paiement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-gray-100">
                      {t.ticketNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{t.plate}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {VEHICLE_TYPE_LABELS[t.vehicleType]}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      {formatCurrency(t.rateAmount)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {formatDateTime(t.entryDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {t.exitDate ? formatDateTime(t.exitDate) : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {t.entryAgent.firstName} {t.entryAgent.lastName}
                    </td>
                    <td className="px-4 py-3">{statusBadge(t.status)}</td>
                    <td className="px-4 py-3">{paymentBadge(t.paymentStatus)}</td>
                  </tr>
                ))}
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
          <p className="text-center text-gray-500 dark:text-gray-400">Aucun ticket trouvé</p>
        </Card>
      )}
    </div>
  );
}
