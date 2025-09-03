# Deployment Configuration

## Required Environment Variables

### Production
```bash
VITE_API_BASE=https://importer.api.savvysales.ai
```

### Development (Optional)
```bash
VITE_DEV_LOCATION_ID=your-location-id-for-testing
```

## Preview Origin Information

The current Lovable preview URL will be in format:
- `https://preview--[project-id].lovable.app`

### To get your exact preview origin:
1. Open your Lovable preview
2. Check the browser URL bar 
3. The domain will be your exact preview origin

### CORS Configuration Needed
Add the following origins to your server's CORS configuration:
- `https://preview--[your-project-id].lovable.app`
- `https://[your-custom-domain].lovable.app` (if using custom domain)

## API Client Features

✅ **Credentials**: All API calls automatically include `credentials: 'include'`  
✅ **Hostname Pinning**: All calls go to exact API base URL  
✅ **Null Safety**: All UI components guard against null/undefined values  
✅ **No Render Loops**: Proper gating of subsequent API calls after app-context  

## Smoke Test Checklist

- [ ] GET `/api/debug/install/<locationId>` returns `{ hasInstall:true, tokenOk:true, companyOk:true }`
- [ ] POST `/api/app-context` shows branding not equal to "Your Agency"  
- [ ] Follow-up routes (e.g., `/api/objects`) return 200 with cookies attached
- [ ] No white screen/loading loops in production preview