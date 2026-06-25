"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { StatCard, CardGrid } from "@/components/ui/card";
import { BarChart } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/use-toast";
import { FileText, Download, Table2, Search, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/audit";
import { VEHICLE_TYPE_LABELS } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";

interface ReportTicket {
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
  payment?: { amount: number };
}

interface ReportSummary {
  totalTickets: number;
  totalRevenue: number;
  paidTickets: number;
  unpaidTickets: number;
}

const statusBadge = (s: string) => <Badge variant={s === "INSIDE" ? "info" : "default"}>{s}</Badge>;
const paymentBadge = (s: string) => <Badge variant={s === "PAID" ? "success" : "danger"}>{s}</Badge>;

export default function ReportsPage() {
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    vehicleType: "",
    agentId: "",
  });
  const [data, setData] = useState<{ tickets: ReportTicket[]; summary: ReportSummary } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  const buildParams = () => {
    const params = new URLSearchParams();
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    if (filters.vehicleType) params.set("vehicleType", filters.vehicleType);
    if (filters.agentId) params.set("agentId", filters.agentId);
    return params;
  };

  const handleSearch = async () => {
    setLoading(true);
    const res = await fetch(`/api/reports?${buildParams()}`);
    const result = await res.json();
    setData(result);
    setShowDetails(false);
    setLoading(false);
  };

  const handleExport = (format: string) => {
    const params = buildParams();
    params.set("format", format);
    window.open(`/api/reports?${params}`, "_blank");
    toast(`Export ${format.toUpperCase()} en cours...`, "info");
  };

  const byTypeData = data
    ? Object.entries(
        data.tickets.reduce<Record<string, number>>((acc, t) => {
          const label = VEHICLE_TYPE_LABELS[t.vehicleType] || t.vehicleType;
          acc[label] = (acc[label] || 0) + 1;
          return acc;
        }, {})
      ).map(([label, value]) => ({ label, value }))
    : [];

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">Rapports</h1>

      <Card title="Filtres" className="mb-8">
        <div className="grid gap-4 md:grid-cols-5">
          <Input
            label="Date début"
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
          <Input
            label="Date fin"
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
          <Select
            label="Type véhicule"
            value={filters.vehicleType}
            onChange={(e) => setFilters({ ...filters, vehicleType: e.target.value })}
            placeholder="Tous"
            options={[
              { value: "MOTO", label: "Moto" },
              { value: "VOITURE", label: "Voiture" },
              { value: "CAMION", label: "Camion" },
              { value: "BUS", label: "Bus" },
            ]}
          />
          <div className="flex items-end gap-2">
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />}
              {loading ? "..." : "Générer"}
            </Button>
          </div>
        </div>
      </Card>

      {data && (
        <>
          <CardGrid className="mb-8">
            <StatCard title="Total tickets" value={data.summary.totalTickets} />
            <StatCard title="Recettes totales" value={formatCurrency(data.summary.totalRevenue)} />
            <StatCard title="Payés" value={data.summary.paidTickets} className="text-green-600" />
            <StatCard title="Non payés" value={data.summary.unpaidTickets} className="text-red-600" />
          </CardGrid>

          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            {byTypeData.length > 0 && (
              <Card title="Par type de véhicule">
                <BarChart data={byTypeData} height={180} />
              </Card>
            )}
          </div>

          <div className="mb-6 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              <Table2 className="h-4 w-4 mr-1" />
              {showDetails ? "Masquer détails" : "Afficher détails"} ({data.tickets.length})
            </Button>
            <div className="flex gap-2">
              <Button onClick={() => handleExport("csv")} variant="secondary" size="sm">
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button onClick={() => handleExport("excel")} variant="secondary" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Excel
              </Button>
              <Button onClick={() => handleExport("pdf")} variant="secondary" size="sm">
                <FileText className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>

          {showDetails && data.tickets.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">N° Ticket</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Plaque</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Tarif</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Entrée</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Agent</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Paiement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.tickets.slice(0, 100).map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-mono text-xs">{t.ticketNumber}</td>
                      <td className="px-4 py-3 font-medium">{t.plate}</td>
                      <td className="px-4 py-3">{VEHICLE_TYPE_LABELS[t.vehicleType]}</td>
                      <td className="px-4 py-3">{formatCurrency(t.rateAmount)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {formatDateTime(t.entryDate)}
                      </td>
                      <td className="px-4 py-3">
                        {t.entryAgent.firstName} {t.entryAgent.lastName}
                      </td>
                      <td className="px-4 py-3">{statusBadge(t.status)}</td>
                      <td className="px-4 py-3">{paymentBadge(t.paymentStatus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.tickets.length > 100 && (
                <div className="p-4 text-center text-sm text-gray-500">
                  Affichage des 100 premiers tickets sur {data.tickets.length}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
