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
- **Deployment:** Vercel (auto-deploys from git push)

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

All calls go to the backend API (base: `https://importer.api.savvysales.ai`):

```
POST /api/objects/:objectKey/fields/import    - Import fields
POST /api/objects/:objectKey/records/import   - Import records
POST /api/objects/:objectKey/records/delete   - Delete records
GET  /api/objects                             - List custom objects
GET  /api/objects/:objectKey/fields           - Get fields for object
```

**Note:** The imports router is mounted at `/api`, NOT `/api/imports`. Check `server.js` in the backend to verify mount points.

---

## Debugging Checklist

### API 404 Errors
When frontend gets 404 from backend:
1. Check the **exact URL** being called (browser Network tab)
2. Verify the **router mount point** in backend `server.js`
3. Don't assume paths based on file structure - always verify

### URL Path Gotchas
- Express doesn't match dots (`.`) in path params by default
- `custom_objects.product` in URL breaks `:objectKey` matching
- Always strip prefixes before putting in URL: `objectKey.replace(/^custom_objects\./, '')`

### React "Objects are not valid as React child" (Error #31)
- Component expects `string` but receives object like `{id, label}`
- Check component interface vs actual props passed
- Common fix: extract the string property (e.g., `steps.map(s => s.label)`)

---

## Development Notes

- **Build:** `npm run build` (outputs to `dist/`)
- **Deploy:** `git push` triggers auto-deploy on Vercel
- **URL:** https://ghl-data-forge.vercel.app
