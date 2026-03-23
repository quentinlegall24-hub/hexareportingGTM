# Hexa GTM Dashboard

Dashboard commercial en temps réel pour les startups du portfolio Hexa. Connecté à Notion comme source de données.

## Deploy on Vercel (2 minutes)

### 1. Push ce repo sur GitHub
```bash
git init && git add . && git commit -m "init hexa dashboard"
gh repo create hexa-gtm-dashboard --private --source=. --push
```

### 2. Crée une intégration Notion
- Va sur https://www.notion.so/my-integrations
- Crée une nouvelle intégration ("Hexa Dashboard")
- Copie le token (commence par `ntn_`)
- Partage la database "Weekly Commercial Reporting" avec cette intégration

### 3. Déploie sur Vercel
- Va sur https://vercel.com/new
- Importe le repo `hexa-gtm-dashboard`
- Ajoute les variables d'environnement :
  - `NOTION_API_KEY` = ton token Notion
  - `NOTION_DATABASE_ID` = `2bd9a15e3b884f0980b011fa145c2b2a`
- Clique "Deploy"

Le dashboard sera accessible sur `hexa-gtm-dashboard.vercel.app` (ou le domaine custom de ton choix).

## Architecture

- **Next.js 14** (App Router + ISR)
- **Notion API** via `@notionhq/client`
- **Recharts** pour les graphiques
- **Tailwind CSS** pour le styling
- Auto-refresh toutes les 5 minutes (ISR côté serveur + polling côté client)
