"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/use-toast";
import { Plus, Edit3, Trash2, Building2 } from "lucide-react";

interface Parking {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  city: string | null;
  isActive: boolean;
  _count: { users: number; tickets: number };
}

const defaultForm = {
  name: "",
  tenantId: "",
  address: "",
  city: "",
  adminEmail: "",
  adminPassword: "",
  adminFirstName: "",
  adminLastName: "",
};

export default function SuperAdminPage() {
  const [parkings, setParkings] = useState<Parking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editParking, setEditParking] = useState<Parking | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [editForm, setEditForm] = useState({ name: "", address: "", city: "" });
  const [error, setError] = useState("");
  const { toast } = useToast();

  const loadParkings = () => {
    setLoading(true);
    fetch("/api/parkings")
      .then((r) => r.json())
      .then((data) => {
        setParkings(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadParkings();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/parkings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Erreur");
      return;
    }

    setShowForm(false);
    setForm(defaultForm);
    toast(`Parking ${data.name} créé avec succès`, "success");
    loadParkings();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editParking) return;

    const res = await fetch(`/api/parkings/${editParking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });

    if (res.ok) {
      toast(`Parking "${editForm.name}" modifié`, "success");
      setEditParking(null);
      loadParkings();
    } else {
      const data = await res.json();
      toast(data.error || "Erreur", "error");
    }
  };

  const handleDelete = async (parking: Parking) => {
    if (!confirm(`Supprimer le parking "${parking.name}" ? Toutes les données seront désactivées.`)) return;

    const res = await fetch(`/api/parkings/${parking.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast(`Parking "${parking.name}" désactivé`, "success");
      loadParkings();
    } else {
      const data = await res.json();
      toast(data.error || "Erreur", "error");
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestion des Parkings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {parkings.length} parking(s) - Création des tenants
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau parking
        </Button>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Créer un parking">
        <form onSubmit={handleCreate} className="grid gap-4">
          <Input label="Nom du parking" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Tenant ID (ex: park_001)" value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })} required />
          <Input label="Adresse" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Input label="Ville" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <p className="mb-3 text-sm font-medium text-gray-500">Administrateur du parking</p>
            <div className="grid gap-4">
              <Input label="Email admin" type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} required />
              <Input label="Mot de passe admin" type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} required />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Prénom" value={form.adminFirstName} onChange={(e) => setForm({ ...form, adminFirstName: e.target.value })} />
                <Input label="Nom" value={form.adminLastName} onChange={(e) => setForm({ ...form, adminLastName: e.target.value })} />
              </div>
            </div>
          </div>
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</div>}
          <Button type="submit" className="w-full">Créer le parking</Button>
        </form>
      </Modal>

      <Modal open={!!editParking} onClose={() => setEditParking(null)} title="Modifier le parking">
        {editParking && (
          <form onSubmit={handleEdit} className="grid gap-4">
            <Input label="Nom" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            <Input label="Adresse" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            <Input label="Ville" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
            <Button type="submit" className="w-full">Enregistrer</Button>
          </form>
        )}
      </Modal>

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Tenant ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Nom</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Ville</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Utilisateurs</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Tickets</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {parkings.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-gray-100">{p.tenantId}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{p.city || "-"}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{p._count.users}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{p._count.tickets}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/parkings/${p.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ isActive: !p.isActive }),
                        });
                        if (res.ok) {
                          toast(`Parking ${p.isActive ? "désactivé" : "activé"}`, "success");
                          loadParkings();
                        } else {
                          const data = await res.json();
                          toast(data.error || "Erreur", "error");
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        p.isActive
                          ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                          : "bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-green-900/30 dark:hover:text-green-400"
                      }`}
                    >
                      {p.isActive ? "Actif" : "Inactif"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditParking(p);
                          setEditForm({ name: p.name, address: p.address || "", city: p.city || "" });
                        }}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-gray-800 dark:hover:text-primary-400"
                        title="Modifier"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800 dark:hover:text-red-400"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
