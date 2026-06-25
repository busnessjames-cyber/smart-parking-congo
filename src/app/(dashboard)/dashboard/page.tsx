"use client";

import { useEffect, useState } from "react";
import { StatCard, CardGrid, Card } from "@/components/ui/card";
import { BarChart, PieChart } from "@/components/ui/chart";
import { Tabs } from "@/components/ui/tabs";
import { StatCardSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import {
  Car,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Users,
  Timer,
  TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/audit";

interface DashboardData {
  vehiclesPresent: number;
  occupancyRate: number;
  totalCapacity: number;
  entriesToday: number;
  exitsToday: number;
  myCollectionsToday?: number;
  myPaymentsCountToday?: number;
  revenueToday?: number;
  paymentsToday?: number;
  revenueMonth?: number;
  paymentsMonth?: number;
  dailyEntries: { date: string; count: number }[];
  dailyRevenue?: { date: string; amount: number }[];
  hourlyActivity: { hour: string; count: number }[];
  vehiclesByType: { vehicleType: string; _count: number }[];
  agentActivity?: Array<{
    agent: { firstName: string; lastName: string };
    totalAmount: number;
    count: number;
  }>;
  ticketsByType?: Array<{ vehicleType: string; _count: number }>;
}

const VEHICLE_COLORS: Record<string, string> = {
  MOTO: "#d97706",
  VOITURE: "#2563eb",
  CAMION: "#16a34a",
  BUS: "#dc2626",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((session) => {
        if (session.user) setUserRole(session.user.role);
      });

    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div>
        <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <CardGrid>
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </CardGrid>
        <div className="mt-8">
          <TableSkeleton rows={3} cols={4} />
        </div>
      </div>
    );
  }

  const isAgent = userRole === "AGENT";
  const isSupervisor = userRole === "SUPERVISOR";
  const isAdmin = userRole === "ADMIN";

  const vehicleTypeData = (data.vehiclesByType || []).map((v) => ({
    label: v.vehicleType,
    value: v._count,
    color: VEHICLE_COLORS[v.vehicleType] || "#6b7280",
  }));

  const hourlyData = data.hourlyActivity
    .filter((h) => h.count > 0)
    .slice(-12);

  const tabs = [];

  if (isAdmin || isSupervisor) {
    tabs.push({
      id: "revenue",
      label: "Recettes",
      content: (
        <Card>
          {data.dailyRevenue ? (
            <>
              <h4 className="mb-4 text-sm font-medium text-gray-500">Recettes (7 derniers jours)</h4>
              <BarChart
                data={data.dailyRevenue.map((d) => ({ label: d.date, value: Math.round(d.amount / 100) }))}
                height={200}
              />
              <p className="mt-2 text-xs text-gray-400">Valeurs en centaines de FCFA</p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Aucune donnée de recette</p>
          )}
        </Card>
      ),
    });
  }

  tabs.push({
    id: "entries",
    label: "Entrées",
    content: (
      <Card>
        <h4 className="mb-4 text-sm font-medium text-gray-500">Entrées (7 derniers jours)</h4>
        <BarChart
          data={data.dailyEntries.map((d) => ({ label: d.date, value: d.count }))}
          height={200}
        />
      </Card>
    ),
  });

  if (hourlyData.length > 0) {
    tabs.push({
      id: "hourly",
      label: "Par heure",
      content: (
        <Card>
          <h4 className="mb-4 text-sm font-medium text-gray-500">Activité horaire (aujourd&apos;hui)</h4>
          <BarChart
            data={hourlyData.map((h) => ({ label: h.hour, value: h.count }))}
            height={200}
          />
        </Card>
      ),
    });
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>

      <CardGrid>
        <StatCard
          title="Véhicules présents"
          value={`${data.vehiclesPresent}/${data.totalCapacity}`}
          icon={<Car className="h-8 w-8" />}
          trend={
            data.occupancyRate > 80
              ? { value: data.occupancyRate, label: "taux d'occupation", positive: false }
              : { value: data.occupancyRate, label: "taux d'occupation", positive: true }
          }
        />
        <StatCard
          title="Entrées du jour"
          value={data.entriesToday}
          icon={<ArrowDownLeft className="h-8 w-8" />}
        />
        <StatCard
          title="Sorties du jour"
          value={data.exitsToday}
          icon={<ArrowUpRight className="h-8 w-8" />}
        />

        {isAgent && (
          <StatCard
            title="Mes encaissements aujourd'hui"
            value={formatCurrency(data.myCollectionsToday ?? 0)}
            icon={<DollarSign className="h-8 w-8" />}
          />
        )}

        {(isSupervisor || isAdmin) && (
          <>
            <StatCard
              title="Recettes du jour"
              value={formatCurrency(data.revenueToday ?? 0)}
              icon={<DollarSign className="h-8 w-8" />}
            />
            <StatCard
              title="Recettes du mois"
              value={formatCurrency(data.revenueMonth ?? 0)}
              icon={<TrendingUp className="h-8 w-8" />}
            />
          </>
        )}
      </CardGrid>

      {/* Charts */}
      <div className="mt-8">
        <Tabs tabs={tabs} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Vehicle distribution pie */}
        {vehicleTypeData.length > 0 && (
          <Card title="Répartition par type (aujourd'hui)">
            <PieChart data={vehicleTypeData} size={160} />
          </Card>
        )}

        {/* Agent activity (admin only) */}
        {isAdmin && data.agentActivity && data.agentActivity.length > 0 && (
          <Card title="Activité des agents (aujourd'hui)">
            <div className="space-y-3">
              {data.agentActivity.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {a.agent?.firstName} {a.agent?.lastName}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(a.totalAmount)}
                    </p>
                    <p className="text-xs text-gray-500">{a.count} encaissements</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
