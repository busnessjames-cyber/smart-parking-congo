# Smart Parking Congo

SaaS multi-tenant de gestion de parking pour le Congo.

## Architecture

- **Multi-tenant** : chaque parking = un tenant (`tenantId` : `park_001`, `park_002`, etc.)
- **Isolation** : toutes les données filtrées par `tenantId`
- **Stack** : Next.js 15, Prisma, PostgreSQL, TypeScript

## Rôles

| Rôle | Permissions |
|------|-------------|
| **SUPER_ADMIN** | Création des parkings uniquement |
| **ADMIN** | Utilisateurs, tarifs, tickets, rapports, paramètres, audit |
| **SUPERVISOR** | Dashboard, rapports, tickets, audit (pas gestion users/tarifs) |
| **AGENT** | Entrée/sortie véhicule, encaissement, PDF, WhatsApp |

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.example .env
# Éditer DATABASE_URL et JWT_SECRET

# 3. Initialiser la base de données
npm run db:push
npm run db:seed

# 4. Lancer le serveur
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Comptes de test (après seed)

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| superadmin@smartparking.cg | superadmin123 | Super Admin |
| admin@park001.cg | admin123 | Admin (park_001) |
| supervisor@park001.cg | admin123 | Superviseur |
| agent@park001.cg | admin123 | Agent |
| admin@park002.cg | admin123 | Admin (park_002) |

## Numérotation des tickets

Format : `PK-CG-YYYY-000001` (incrémentation annuelle)

## Tarification forfaitaire

| Type | Tarif par défaut |
|------|-----------------|
| Moto | 500 FCFA |
| Voiture | 1000 FCFA |
| Camion | 2000 FCFA |
| Bus | 3000 FCFA |

Le tarif est figé dans le ticket à l'entrée.

## Modules

- **Entrée véhicule** : photo (OCR), plaque, type → ticket INSIDE
- **Sortie véhicule** : recherche, autorisation sortie, encaissement, PDF, WhatsApp
- **Dashboard** : adapté par rôle (agent ne voit pas recettes globales)
- **Rapports** : filtres date/agent/type, export PDF et Excel
- **Audit Log** : toutes les actions tracées
