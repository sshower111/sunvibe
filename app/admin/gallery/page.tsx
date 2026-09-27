import { redirect } from 'next/navigation'
// Legacy page replaced by Admin > Gallery. Safe to delete this file.
export default function LegacyAdminGallery() { redirect('/admin') }
