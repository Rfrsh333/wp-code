# Setup Editorial Images Storage Bucket

Als je de error krijgt: **"Afbeelding branden/uploaden mislukt"** bij het genereren van hero images in het admin dashboard, dan moet je de Supabase storage bucket aanmaken.

## Stappen

### 1. Open Supabase Dashboard
- Ga naar [supabase.com](https://supabase.com)
- Log in en open je TopTalent project

### 2. Open SQL Editor
- Klik in het linker menu op **SQL Editor**
- Klik op **New Query**

### 3. Kopieer en run de setup script
- Open het bestand `scripts/setup-editorial-bucket.sql`
- Kopieer de hele inhoud
- Plak in de SQL Editor
- Klik op **Run** (of druk op Ctrl+Enter / Cmd+Enter)

### 4. Verifieer dat het werkt
De query zou moeten eindigen met een resultaat dat laat zien:
```
id: editorial-images
name: editorial-images
public: true
file_size_limit: 10485760
allowed_mime_types: {image/jpeg, image/jpg, image/png, image/webp, image/gif}
```

### 5. Test de hero image generatie
- Ga terug naar je Admin Dashboard
- Ga naar Content Overview → Drafts
- Klik op **Genereer afbeelding** bij een draft zonder hero image
- Het zou nu moeten werken! 🎉

## Troubleshooting

### Error blijft bestaan na het draaien van de script?
1. Check of de bucket daadwerkelijk bestaat:
   - Ga naar **Storage** in het Supabase menu
   - Je zou een bucket genaamd `editorial-images` moeten zien

2. Check de policies:
   - Klik op de `editorial-images` bucket
   - Ga naar de **Policies** tab
   - Je zou 5 policies moeten zien

3. Herstart de Vercel deployment:
   ```bash
   git commit --allow-empty -m "trigger: redeploy"
   git push
   ```

### Nog steeds problemen?
Check de server logs in Vercel:
- Ga naar je Vercel dashboard
- Klik op je deployment
- Ga naar **Functions** → **Logs**
- Zoek naar errors met `[storage]` prefix

De error messages zouden nu duidelijk moeten aangeven wat er mis is.
