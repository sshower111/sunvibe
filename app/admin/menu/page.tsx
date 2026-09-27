import { redirect } from 'next/navigation'
// Legacy page replaced by Admin > Menu. Safe to delete this file.
export default function LegacyAdminMenu() { redirect('/admin') }
