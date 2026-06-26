"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/lib/use-toast";
import { VEHICLE_TYPE_LABELS } from "@/lib/permissions";
import { formatCurrency } from "@/lib/audit";
import { Select } from "@/components/ui/select";
import { Save, Trash2, Plus } from "lucide-react";

interface Rate {
  id: string;
  vehicleType: string;
  amount: number;
}

export default function RatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [editing, setEditing] = useState<Record<string, number>>({});
  const [newType, setNewType] = useState("MOTO");
  const [newAmount, setNewAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadRates = () => {
    fetch("/api/rates")
      .then((r) => r.json())
      .then((data: Rate[]) => {
        setRates(data);
        const edit: Record<string, number> = {};
        data.forEach((r) => { edit[r.vehicleType] = r.amount; });
        setEditing(edit);
      });
  };

  useEffect(() => { loadRates(); }, []);

  const handleSave = async (vehicleType: string) => {
    await fetch("/api/rates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleType, amount: editing[vehicleType] }),
    });
    toast(`Tarif ${VEHICLE_TYPE_LABELS[vehicleType] || vehicleType} mis à jour`, "success");
  };

  const handleDelete = async (vehicleType: string) => {
    if (!confirm(`Supprimer le tarif "${VEHICLE_TYPE_LABELS[vehicleType] || vehicleType}" ?`)) return;
    const res = await fetch("/api/rates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleType }),
    });
    if (res.ok) {
      toast(`Tarif "${VEHICLE_TYPE_LABELS[vehicleType] || vehicleType}" supprimé`, "success");
      loadRates();
    } else {
      const data = await res.json();
      toast(data.error || "Erreur lors de la suppression", "error");
    }
  };

  const handleAdd = async () => {
    if (!newAmount) return;
    setLoading(true);
    const res = await fetch("/api/rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleType: newType, amount: Number(newAmount) }),
    });
    const data = await res.json();
    if (res.ok) {
      toast(`Tarif "${VEHICLE_TYPE_LABELS[newType]}" ajouté`, "success");
      setNewType("");
      setNewAmount("");
      loadRates();
    } else {
      toast(data.error || "Erreur lors de l'ajout", "error");
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">Tarification</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Les tarifs sont enregistrés dans le ticket au moment de l&apos;entrée. Une modification
        future ne modifie pas les tickets existants.
      </p>

      <Card title="Ajouter un tarif" className="mb-6">
        <div className="flex items-end gap-3">
          <div className="w-48">
            <Select
              id="newType"
              label="Type de véhicule"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              options={["MOTO", "VOITURE", "CAMION", "BUS"]
                .filter((t) => !rates.find((r) => r.vehicleType === t))
                .map((t) => ({ value: t, label: VEHICLE_TYPE_LABELS[t] }))}
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Montant (FCFA)
            </label>
            <Input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="500"
            />
          </div>
          <Button onClick={handleAdd} disabled={loading || !newAmount}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {rates.map((rate) => (
          <Card key={rate.id}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {VEHICLE_TYPE_LABELS[rate.vehicleType] || rate.vehicleType}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tarif forfaitaire</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={editing[rate.vehicleType] ?? rate.amount}
                  onChange={(e) =>
                    setEditing({ ...editing, [rate.vehicleType]: Number(e.target.value) })
                  }
                  className="w-28"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">FCFA</span>
                <Button size="sm" onClick={() => handleSave(rate.vehicleType)}>
                  <Save className="h-3 w-3 mr-1" />
                  Sauver
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDelete(rate.vehicleType)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              Actuel: {formatCurrency(rate.amount)}
            </p>
          </Card>
        ))}
      </div>

      {rates.length === 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
          Aucun tarif configuré. Ajoutez-en un ci-dessus.
        </p>
      )}
    </div>
  );
}