import 'server-only'
import { downloadPrivateFile, uploadPrivateFile } from './photo-storage'

/** Reference photo names look like "1.jpg"; the number is its place in the inquiry email. */
export const INQUIRY_PHOTO_NAME = /^[1-9]\.(jpg|png|webp)$/
export const inquiryPhotoMime = (name: string) =>
  ({ jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' })[name.split('.')[1]] ?? 'application/octet-stream'
const photoPath = (inquiryId: string, name: string) => `cake-inquiries/${inquiryId}/${name}`

/**
 * Keeps a copy of an inquiry's reference photos (encrypted) so admin can show them.
 * Returns the names saved; a photo that fails to save is logged and left out (it is still in the email).
 */
export async function saveInquiryPhotos(inquiryId: string, photos: { filename: string; content: Buffer }[]) {
  const results = await Promise.allSettled(
    photos.map(async (photo, i) => {
      const name = `${i + 1}.${photo.filename.split('.').pop()}`
      if (!INQUIRY_PHOTO_NAME.test(name)) throw new Error('Unexpected photo name')
      await uploadPrivateFile(photoPath(inquiryId, name), photo.content)
      return name
    }),
  )
  for (const r of results) if (r.status === 'rejected') console.error('Inquiry photo not saved', inquiryId, r.reason)
  return results.flatMap(r => (r.status === 'fulfilled' ? [r.value] : []))
}

export const readInquiryPhoto = (inquiryId: string, name: string) => downloadPrivateFile(photoPath(inquiryId, name))
