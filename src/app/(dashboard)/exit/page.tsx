"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/use-toast";
import { Search, FileText, MessageCircle, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/audit";
import { formatDateTime } from "@/lib/utils";
import { VEHICLE_TYPE_LABELS } from "@/lib/permissions";

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

export default function ExitPage() {
  const [search, setSearch] = useState("");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    setError("");
    setTicket(null);

    try {
      const params = new URLSearchParams();
      params.set("status", "INSIDE");

      const isTicketNumber = search.includes("PK-");
      if (isTicketNumber) {
        params.set("ticketNumber", search.trim());
      } else {
        params.set("plate", search.trim().toUpperCase());
      }

      const res = await fetch(`/api/tickets?${params}`);
      const data = await res.json();

      const tickets = data.tickets || data;
      if (!tickets.length) {
        setError("Aucun ticket trouvé pour ce véhicule");
        return;
      }

      setTicket(tickets[0]);
    } catch {
      setError("Erreur de recherche");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorizeExit = async () => {
    if (!ticket) return;
    setActionLoading("exit");
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "authorize_exit" }),
      });
      const data = await res.json();
      if (res.ok) {
        setTicket(data);
        toast(`Sortie autorisée pour ${ticket.plate}`, "success");
      }
    } finally {
      setActionLoading("");
    }
  };

  const handlePayment = async () => {
    if (!ticket) return;
    setActionLoading("payment");
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/payment`, { method: "POST" });
      if (res.ok) {
        const resp = await fetch(`/api/tickets/${ticket.id}`);
        const updated = await resp.json();
        setTicket(updated);
        toast(`Paiement de ${formatCurrency(ticket.rateAmount)} encaissé`, "success");
      }
    } finally {
      setActionLoading("");
    }
  };

  const handlePdf = () => {
    if (!ticket) return;
    window.open(`/api/tickets/${ticket.id}/pdf`, "_blank");
  };

  const handleWhatsApp = async () => {
    if (!ticket) return;
    const res = await fetch(`/api/tickets/${ticket.id}/whatsapp`);
    const data = await res.json();
    if (data.whatsappUrl) window.open(data.whatsappUrl, "_blank");
  };

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">Sortie Véhicule</h1>

      <Card title="Rechercher un ticket" className="mb-8">
        <div className="flex gap-4">
          <Input
            placeholder="N° ticket ou plaque d'immatriculation"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            {loading ? "Recherche..." : "Rechercher"}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </Card>

      {ticket && (
        <Card title={`Ticket ${ticket.ticketNumber}`}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium text-gray-500 dark:text-gray-400">Plaque:</span>{" "}
                <span className="text-gray-900 dark:text-gray-100">{ticket.plate}</span>
              </p>
              <p className="text-sm">
                <span className="font-medium text-gray-500 dark:text-gray-400">Type:</span>{" "}
                <span className="text-gray-900 dark:text-gray-100">
                  {VEHICLE_TYPE_LABELS[ticket.vehicleType]}
                </span>
              </p>
              <p className="text-sm">
                <span className="font-medium text-gray-500 dark:text-gray-400">Tarif:</span>{" "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(ticket.rateAmount)}
                </span>
              </p>
              <p className="text-sm">
                <span className="font-medium text-gray-500 dark:text-gray-400">Entrée:</span>{" "}
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDateTime(ticket.entryDate)}
                </span>
              </p>
              <p className="text-sm">
                <span className="font-medium text-gray-500 dark:text-gray-400">Agent:</span>{" "}
                <span className="text-gray-900 dark:text-gray-100">
                  {ticket.entryAgent.firstName} {ticket.entryAgent.lastName}
                </span>
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium text-gray-500 dark:text-gray-400">Statut:</span>{" "}
                <Badge variant={ticket.status === "INSIDE" ? "info" : "default"}>
                  {ticket.status}
                </Badge>
              </p>
              <p className="text-sm">
                <span className="font-medium text-gray-500 dark:text-gray-400">Paiement:</span>{" "}
                <Badge variant={ticket.paymentStatus === "PAID" ? "success" : "danger"}>
                  {ticket.paymentStatus}
                </Badge>
              </p>
              {ticket.exitDate && (
                <p className="text-sm">
                  <span className="font-medium text-gray-500 dark:text-gray-400">Sortie:</span>{" "}
                  <span className="text-gray-900 dark:text-gray-100">
                    {formatDateTime(ticket.exitDate)}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {ticket.status === "INSIDE" && (
              <Button
                onClick={handleAuthorizeExit}
                disabled={actionLoading === "exit"}
              >
                Autoriser sortie
              </Button>
            )}

            {ticket.paymentStatus === "UNPAID" && (
              <Button
                onClick={handlePayment}
                disabled={actionLoading === "payment"}
                variant="secondary"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Encaisser {formatCurrency(ticket.rateAmount)}
              </Button>
            )}

            <Button onClick={handlePdf} variant="ghost">
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>

            <Button onClick={handleWhatsApp} variant="ghost">
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
