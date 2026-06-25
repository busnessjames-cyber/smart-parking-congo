"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/use-toast";
import { Plus, Trash2, Pencil, Shield } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const defaultForm = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  role: "AGENT",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", role: "", password: "" });
  const [error, setError] = useState("");
  const { toast } = useToast();

  const loadUsers = () => {
    setLoading(true);
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      });
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setShowCreate(false);
    setForm(defaultForm);
    toast("Utilisateur créé avec succès", "success");
    loadUsers();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    const body: Record<string, string> = {};
    if (editForm.firstName) body.firstName = editForm.firstName;
    if (editForm.lastName) body.lastName = editForm.lastName;
    if (editForm.role) body.role = editForm.role;
    if (editForm.password) body.password = editForm.password;

    const res = await fetch(`/api/users/${editUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    setEditUser(null);
    setEditForm({ firstName: "", lastName: "", role: "", password: "" });
    toast("Utilisateur mis à jour", "success");
    loadUsers();
  };

  const handleDeactivate = async (id: string) => {
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    toast("Utilisateur désactivé", "info");
    loadUsers();
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setEditForm({ firstName: user.firstName, lastName: user.lastName, role: user.role, password: "" });
    setError("");
  };

  const roleBadge = (role: string) => {
    const variant = role === "ADMIN" ? "info" : role === "SUPERVISOR" ? "warning" : "default";
    return <Badge variant={variant as any}>{role}</Badge>;
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Utilisateurs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {users.length} utilisateur(s) - {users.filter((u) => u.isActive).length} actif(s)
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Créer un utilisateur">
        <form onSubmit={handleCreate} className="grid gap-4">
          <Input label="Prénom" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          <Input label="Nom" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Mot de passe" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Select label="Rôle" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={[
            { value: "AGENT", label: "Agent" },
            { value: "SUPERVISOR", label: "Superviseur" },
            { value: "ADMIN", label: "Administrateur" },
          ]} />
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          <Button type="submit" className="w-full">Créer</Button>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Modifier l'utilisateur">
        <form onSubmit={handleEdit} className="grid gap-4">
          <Input label="Prénom" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
          <Input label="Nom" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
          <Select label="Rôle" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} options={[
            { value: "AGENT", label: "Agent" },
            { value: "SUPERVISOR", label: "Superviseur" },
            { value: "ADMIN", label: "Administrateur" },
          ]} />
          <Input label="Nouveau mot de passe (laisser vide pour conserver)" type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
          {editUser && (
            <p className="text-xs text-gray-400">
              Email: {editUser.email} (non modifiable)
            </p>
          )}
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          <div className="flex gap-3">
            <Button type="submit" className="flex-1">Sauvegarder</Button>
            <Button type="button" variant="secondary" onClick={() => setEditUser(null)}>Annuler</Button>
          </div>
        </form>
      </Modal>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Nom</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Rôle</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{user.email}</td>
                  <td className="px-4 py-3">{roleBadge(user.role)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isActive ? "success" : "danger"}>
                      {user.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {user.isActive && (
                        <button
                          onClick={() => handleDeactivate(user.id)}
                          className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
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
