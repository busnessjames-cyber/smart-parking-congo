"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/lib/use-toast";
import { VEHICLE_TYPE_LABELS } from "@/lib/permissions";
import { formatCurrency } from "@/lib/audit";
import { Save } from "lucide-react";

interface Rate {
  id: string;
  vehicleType: string;
  amount: number;
}

export default function RatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [editing, setEditing] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/rates")
      .then((r) => r.json())
      .then((data) => {
        setRates(data);
        const edit: Record<string, number> = {};
        data.forEach((r: Rate) => { edit[r.vehicleType] = r.amount; });
        setEditing(edit);
      });
  }, []);

  const handleSave = async (vehicleType: string) => {
    await fetch("/api/rates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleType, amount: editing[vehicleType] }),
    });
    toast(`Tarif ${VEHICLE_TYPE_LABELS[vehicleType]} mis à jour`, "success");
  };

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">Tarification</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Les tarifs sont enregistrés dans le ticket au moment de l&apos;entrée. Une modification
        future ne modifie pas les tickets existants.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {rates.map((rate) => (
          <Card key={rate.id}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {VEHICLE_TYPE_LABELS[rate.vehicleType]}
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
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              Actuel: {formatCurrency(rate.amount)}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
