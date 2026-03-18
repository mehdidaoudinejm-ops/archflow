import { redirect } from 'next/navigation'

export default function RegisterCompanyPage() {
  redirect('/login?error=lien_invalide')
}
