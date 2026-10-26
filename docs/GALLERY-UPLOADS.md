# Gallery uploads from a phone

Admin → Gallery → **Add photos**. Select one or several photos; uploads start automatically. Keep the page open until the result appears. Successful photos are added immediately; failed photos are listed individually and can be selected again.

- HEIC/HEIF is converted locally using the lazy-loaded CSP-compatible heic-to decoder. JPG, PNG, WebP, GIF and browser-supported AVIF are decoded locally.
- Photos are resized to a maximum 2,000 pixels on the longest side, encoded as JPEG, and capped at 3 MB before upload. Source files over 30 MB are rejected to limit mobile memory use. Originals on the phone are unchanged.
- Canvas output omits original EXIF/GPS metadata. Transparent areas become white; animation/Live Photo motion is not retained.
- Uploads run sequentially, preserving existing authenticated upload and gallery-save endpoints. Existing server upload rate limits still apply (20 requests/hour per IP).
- A failed gallery save after storage upload can leave an unlisted file; no automatic deletion is performed. No new public write permissions are introduced.
- Photo links remain available under the collapsed “Or add a photo link” control.

Validation: `pnpm build` and a manual check of Admin → Gallery on a phone (HEIC and large photos).

## Share from iPhone Photos (no sign-in)

Select photos in Photos → **Share** → **Add to Sunville gallery**. They go live in the gallery right away (at the end, like admin uploads). Remove a wrong one in Admin → Gallery.

The Shortcut posts each photo to `POST /api/gallery/share` with `Authorization: Bearer <GALLERY_SHARE_KEY>`. That key can only add gallery photos. The server turns every photo into an upright JPEG of at most 2,000 px with all metadata removed (no GPS location), the same as Admin → Add photos. Limits: 4 MB per photo (Vercel refuses larger requests), 60 photos an hour.

**One-time setup**

1. Make a key (PowerShell): `$b = New-Object byte[] 32; [Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($b); [Convert]::ToBase64String($b)`. Add it in Vercel → Settings → Environment Variables as `GALLERY_SHARE_KEY` (Production), then redeploy. Keys under 32 characters are refused.
2. On the iPhone, open **Shortcuts** → **+**, name it **Add to Sunville gallery**. In its details (ⓘ), turn on **Show in Share Sheet** and set it to receive **Images** only.
3. Add these actions:
   - **Receive Images from Share Sheet** (added for you). If there's no input: **Stop and Respond**.
   - **Repeat with Each** item in Shortcut Input. Inside the repeat:
     - **Convert Image** (Repeat Item) to **JPEG**, quality about 80%, **Preserve Metadata** off.
     - **Resize Image** (Converted Image) to width **2000**, height **Auto**.
     - **Get Contents of URL**: `https://sunvillebakerylv.com/api/gallery/share`, Method **POST**, Header `Authorization` = `Bearer ` + the key, Request Body **File** = Resized Image.
   - After **End Repeat**: **Show Notification** "Added to the gallery".
4. Test it with one photo, then check the gallery.

**Lost phone or leaked key:** change `GALLERY_SHARE_KEY` in Vercel and redeploy; the old Shortcut stops working. Put the new key in the Shortcut's header.
