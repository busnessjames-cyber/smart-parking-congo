"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { VEHICLE_TYPE_LABELS } from "@/lib/permissions";
import { formatCurrency } from "@/lib/audit";
import { formatDateTime } from "@/lib/utils";
import { Search, History, FileText } from "lucide-react";

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
}

export default function HistoryPage() {
  const [plate, setPlate] = useState("");
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!plate.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/tickets?search=${encodeURIComponent(plate.trim().toUpperCase())}&limit=50`);
      const data = await res.json();
      setTickets(data.tickets || data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <History className="h-7 w-7 text-primary-500" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Historique véhicule</h1>
      </div>

      <Card className="mb-8">
        <div className="flex gap-4">
          <Input
            placeholder="Rechercher par plaque d'immatriculation..."
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            {loading ? "..." : "Rechercher"}
          </Button>
        </div>
      </Card>

      {loading && <TableSkeleton rows={5} cols={6} />}

      {searched && !loading && tickets?.length === 0 && (
        <Card>
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p className="font-medium">Aucun historique trouvé pour cette plaque</p>
            <p className="text-sm mt-1">Vérifiez la plaque et réessayez</p>
          </div>
        </Card>
      )}

      {tickets && tickets.length > 0 && (
        <>
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <FileText className="h-4 w-4" />
            {tickets.length} ticket(s) trouvé(s) pour {plate}
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">N° Ticket</th>
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
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-gray-100">
                      {t.ticketNumber}
                    </td>
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
                    <td className="px-4 py-3">
                      <Badge variant={t.status === "INSIDE" ? "info" : "default"}>
                        {t.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={t.paymentStatus === "PAID" ? "success" : "danger"}>
                        {t.paymentStatus}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
