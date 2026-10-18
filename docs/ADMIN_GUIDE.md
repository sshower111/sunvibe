# Admin guide

Go to https://sunvillebakerylv.com/admin and sign in with the admin password. You stay signed in on that device for 12 hours. Works on phones.

## Menu

- Search items, filter Visible / Hidden.
- Each item shows a small photo, or "No photo" if it has none. Photos marked **Blurry** are too small (under 600 pixels) to look sharp on the menu; replace them with a larger photo.
- The menu shows every photo as a square, so take photos with the whole item in the middle and some space around it.
- **Edit item**: photo, name, description, price. Changes appear on the public menu right away.
- **Photos**: in Edit item or Add menu item, tap **Add photo** (or **Change photo**) and pick one from your phone or computer. iPhone HEIC photos are converted and large photos resized automatically. It uploads straight away, but only shows on the menu after you press **Save changes** / **Add item**. **Remove photo** puts back "Photo coming soon". A replaced photo is deleted from storage unless the gallery or an occasion still uses it.
- **Hide / Show**: removes an item from the public menu without deleting it.
- **Add menu item**: photo, name, price, category, description.

## Gallery

- **Add photos**: pick one or more photos from your phone; they are converted and resized automatically.
- **Or add a photo link** for an image hosted elsewhere.
- **Remove photo** (tap twice to confirm). Uploaded files are deleted from storage unless a menu item or occasion still uses them.

## Occasions (festival pre-orders)

- One campaign drives the site banner and the /pre-order page while it is active and published.
- **New occasion** → pick a preset, edit dates, banner text, page text and items → **Save & preview**, then **Publish**.
- **Save draft** unpublishes. Empty campaigns show a "call us" message.

## Pre-orders

- Reservation requests from /pre-order. Call the customer, then update the status.

## Settings

- Maintenance mode is set in Vercel (`MAINTENANCE_MODE=true`, then redeploy). Admin keeps working while it is on.

## Changing the password

In Vercel set a new `ADMIN_PASSWORD` (type Secret) and redeploy. Keep `CAMPAIGN_STORAGE_SECRET` unchanged: it decrypts saved pre-orders.
