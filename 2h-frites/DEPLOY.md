# Procedure de deploiement — 2H Frites Artisanales

## Architecture

- **Projet Vercel** : `h2frites` (dominus-doms-projects)
- **Domaine production** : `www.2hfrites.be` / `2hfrites.be`
- **Mode de deploiement** : CLI exclusif (pas de Git auto-deploy)
- **Projet Vercel "2h-frites"** : ancien projet, NE PAS utiliser (pas de domaine custom)

## Prerequis

```bash
# Node.js 24.x
node --version

# Vercel CLI
npm i -g vercel
vercel --version

# Authentification
vercel login
```

## Variables d'environnement

Toutes les variables sont gerees via le **Dashboard Vercel** (ou `vercel env add`).
Elles sont injectees au runtime dans les fonctions serverless.

| Variable | Usage | Obligatoire |
|----------|-------|-------------|
| `DATABASE_URL` | PostgreSQL Neon | Oui |
| `AUTH_SECRET` | HMAC-SHA256 signature tokens | Oui |
| `GEMINI_API_KEY` | Google Gemini API (extraction IA factures) | Oui |
| `KIOSK_API_KEY` | Authentification borne kiosk | Oui |
| `CLOUDINARY_CLOUD_NAME` | Upload media | Oui |
| `CLOUDINARY_API_KEY` | Upload media | Oui |
| `CLOUDINARY_API_SECRET` | Upload media | Oui |

### Verifier les variables

```bash
vercel env ls
```

### Ajouter une variable

```bash
printf 'VALEUR' | vercel env add NOM_VARIABLE production
```

**Important** : Apres ajout/modification d'une variable, un **redeploy est necessaire**.

## Deploiement

### Structure critique

Le projet Vercel `h2frites` a `rootDirectory: "2h-frites"`.
Il faut donc deployer depuis le **repertoire parent** (`assets/`) :

```bash
cd /Users/conceptus/Desktop/2H/assets

# Le repertoire doit contenir .vercel/project.json pointant vers h2frites
# Et le code source dans le sous-dossier 2h-frites/
```

### Deployer en production

```bash
cd /path/to/parent/directory  # (le parent de 2h-frites/)
vercel deploy --prod --yes
```

Le build est fait **localement** puis uploade sur Vercel.

### Verifier le deploiement

```bash
# Health check
curl -s https://www.2hfrites.be/api/health | python3 -m json.tool

# Verifier uptime < 60s (nouveau deploy)
# Verifier database: "ok"
# Verifier environment: "production"
```

## Fichier .vercel/project.json (parent directory)

```json
{
  "projectId": "prj_ihKlcFjqj2KtBgyvQsipjAfS4Q3B",
  "orgId": "team_6gecvsFf8cN7jlaozqvdYwiW",
  "projectName": "h2frites"
}
```

## Fichiers sensibles (NE PAS commiter)

Les fichiers suivants sont dans `.gitignore` :
- `.env` — variables locales de dev
- `.env.local` — genere par `vercel env pull`
- `.env.production.local` — genere par `vercel env pull --environment production`
- `.vercel/` — configuration projet Vercel

## Rollback

Pour revenir a un deploiement precedent :

```bash
vercel ls --prod  # Lister les deploiements
vercel promote <deployment-url>  # Promouvoir un ancien deploiement
```

## Diagnostic

```bash
# Logs en temps reel
vercel logs <deployment-url>

# Inspecter un deploiement
vercel inspect <deployment-url>

# Tester un deploiement specifique (bypass protection)
vercel curl /api/health --deployment <deployment-url>
```
