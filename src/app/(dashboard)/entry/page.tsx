"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/use-toast";
import { Camera, CheckCircle, Printer } from "lucide-react";
import { formatCurrency } from "@/lib/audit";
import { VEHICLE_TYPE_LABELS } from "@/lib/permissions";

export default function EntryPage() {
  const [plate, setPlate] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleTypes, setVehicleTypes] = useState<{ value: string; label: string }[]>([]);
  const [ratesLoaded, setRatesLoaded] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    id: string;
    ticketNumber: string;
    rateAmount: number;
  } | null>(null);
  useEffect(() => {
    fetch("/api/rates")
      .then((r) => r.json())
      .then((data: { vehicleType: string; amount: number }[]) => {
        const types = data.map((r) => ({
          value: r.vehicleType,
          label: `${VEHICLE_TYPE_LABELS[r.vehicleType] || r.vehicleType} - ${formatCurrency(r.amount)}`,
        }));
        setVehicleTypes(types);
        if (types.length > 0) setVehicleType(types[0].value);
        setRatesLoaded(true);
      });
  }, []);

  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhoto(file);
    setPreview(URL.createObjectURL(file));

    setOcrLoading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch("/api/ocr", { method: "POST", body: formData });
      const data = await res.json();

      if (data.plate) {
        setPlate(data.plate);
        toast("Plaque détectée par OCR", "success");
      }
    } catch {
      // OCR optional - user can enter manually
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("plate", plate.trim().toUpperCase());
      formData.append("vehicleType", vehicleType);
      if (photo) formData.append("photo", photo);

      const res = await fetch("/api/tickets", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }

      setSuccess({
        id: data.id,
        ticketNumber: data.ticketNumber,
        rateAmount: data.rateAmount,
      });
      setPlate("");
      setPhoto(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      toast(`Ticket ${data.ticketNumber} créé`, "success");
    } catch {
      setError("Erreur lors de la création du ticket");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (id: string) => {
    window.open(`/api/tickets/${id}/pdf`, "_blank");
  };

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">Entrée Véhicule</h1>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card title="Nouveau ticket">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Photo (facultative)
              </label>
              <div
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 cursor-pointer hover:border-primary-400 dark:border-gray-600 dark:hover:border-primary-500"
                onClick={() => fileRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="max-h-48 rounded-lg" />
                ) : (
                  <>
                    <Camera className="h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Cliquez pour prendre une photo
                    </p>
                    <p className="text-xs text-gray-400">OCR automatique de la plaque</p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhoto}
                />
              </div>
              {ocrLoading && (
                <p className="mt-2 text-sm text-primary-600">Détection OCR en cours...</p>
              )}
            </div>

            <Input
              id="plate"
              label="Plaque d'immatriculation"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="ABC-123-CG"
              required
            />

            <Select
              id="vehicleType"
              label="Type de véhicule"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              options={vehicleTypes}
              disabled={!ratesLoaded}
            />

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Création..." : "Créer le ticket"}
            </Button>
          </form>
        </Card>

        {success && (
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">Ticket créé !</h3>
            </div>
            <div className="space-y-2 text-green-700 dark:text-green-400">
              <p>
                <span className="font-medium">N° Ticket:</span>{" "}
                <span className="font-mono">{success.ticketNumber}</span>
              </p>
              <p>
                <span className="font-medium">Tarif:</span> {formatCurrency(success.rateAmount)}
              </p>
              <p>
                <span className="font-medium">Statut:</span>{" "}
                <Badge variant="info">INSIDE</Badge>
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => handlePrint(success.id)}
                variant="secondary"
                size="sm"
              >
                <Printer className="h-4 w-4 mr-1" />
                Imprimer
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
