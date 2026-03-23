# Hexa GTM Dashboard

Dashboard commercial en temps réel pour les startups du portfolio Hexa. Les données sont lues depuis un fichier `public/data.json` mis à jour chaque vendredi via GitHub.

## Deploy on Vercel (2 minutes)

### 1. Push ce repo sur GitHub
```bash
git init && git add . && git commit -m "init hexa dashboard"
gh repo create hexa-gtm-dashboard --private --source=. --push
```

### 2. Déploie sur Vercel
- Va sur https://vercel.com/new
- Importe le repo `hexa-gtm-dashboard`
- Clique "Deploy"

Aucune variable d'environnement requise — les données sont servies depuis `public/data.json`.

Le dashboard sera accessible sur `hexa-gtm-dashboard.vercel.app` (ou le domaine custom de ton choix).

## Architecture

- **Next.js 14** (App Router + ISR)
- **Static JSON** (`public/data.json`) comme source de données
- **Recharts** pour les graphiques
- **Tailwind CSS** pour le styling
- Auto-refresh toutes les 5 minutes (ISR côté serveur + polling côté client)
