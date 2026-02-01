# Claude Code Project Context

## Project Architecture

**This is the FRONTEND** - a React + TypeScript app that provides:
- UI for importing/exporting custom object fields and records
- CSV file upload and preview
- Field mapping interface
- Import progress tracking and error display

**The BACKEND is a separate Node.js API** located at:
- **Local path:** `/Users/davidsonshine/Desktop/Custom Object Importer/custom-object-importer`
- **GitHub:** `https://github.com/dasonshi/custom-object-importer`
- **Deployed on:** Render.com (auto-deploys from git push)
- **API URL:** `https://importer.api.savvysales.ai`

---

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **UI Components:** shadcn/ui + Tailwind CSS
- **CSV Parsing:** PapaParse (client-side)
- **Deployment:** Lovable (NOT auto-deployed from git push - requires Lovable sync)

---

## Key Components

| Component | Purpose |
|-----------|---------|
| `ImportRecordsTab.tsx` | CSV upload for record imports, field mapping, progress display |
| `AddFieldsTab.tsx` | CSV upload for field/schema imports |
| `FieldMappingTable.tsx` | Map CSV columns to GHL fields |
| `UpdateRecordsTab.tsx` | Update existing records |
| `lib/fieldMapping.ts` | Auto-match algorithm for CSV→GHL field mapping |
| `lib/errorSuggestions.ts` | Error pattern matching and helpful suggestions |

---

## API Endpoints Used

All calls go to the backend API:

```
POST /api/imports/objects/:objectKey/fields/import   - Import fields
POST /api/imports/objects/:objectKey/records/import  - Import records
GET  /api/objects                                     - List custom objects
GET  /api/objects/:objectKey/fields                  - Get fields for object
```

---

## Development Notes

- **Build:** `npm run build` (outputs to `dist/`)
- **Lovable:** Changes must be synced through Lovable to deploy
- **Git push:** Does NOT auto-deploy - only updates GitHub repo
