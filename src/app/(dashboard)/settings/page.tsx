"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/lib/use-toast";
import { Save } from "lucide-react";

export default function SettingsPage() {
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    ticketPrefix: "PK-CG",
    currency: "FCFA",
    whatsappEnabled: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          name: data.parking?.name || "",
          address: data.parking?.address || "",
          city: data.parking?.city || "",
          ticketPrefix: data.settings?.ticketPrefix || "PK-CG",
          currency: data.settings?.currency || "FCFA",
          whatsappEnabled: data.settings?.whatsappEnabled ?? true,
        });
      });
  }, []);

  const handleSave = async () => {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    toast("Paramètres sauvegardés", "success");
  };

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">Paramètres</h1>

      <Card title="Informations du parking" className="mb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Nom"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Ville"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <Input
            label="Adresse"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="md:col-span-2"
          />
        </div>
      </Card>

      <Card title="Configuration tickets" className="mb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Préfixe ticket (ex: PK-CG)"
            value={form.ticketPrefix}
            onChange={(e) => setForm({ ...form, ticketPrefix: e.target.value })}
          />
          <Input
            label="Devise"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          />
        </div>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          Format: {form.ticketPrefix}-2026-000001
        </p>
      </Card>

      <Button onClick={handleSave}>
        <Save className="h-4 w-4 mr-2" />
        Sauvegarder
      </Button>
    </div>
  );
}
