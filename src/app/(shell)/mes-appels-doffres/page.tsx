import { redirect } from 'next/navigation'
import { getUserWithProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MesAOClient } from './MesAOClient'

export default async function MesAOPage() {
  const user = await getUserWithProfile()
  if (!user) redirect('/login')
  if (user.role !== 'COMPANY') redirect('/dashboard')

  const aoCompanies = await prisma.aOCompany.findMany({
    where: { companyUserId: user.id },
    include: {
      ao: {
        include: {
          dpgf: {
            include: {
              project: { select: { name: true, address: true } },
            },
          },
        },
      },
      offer: { select: { id: true, submittedAt: true, isComplete: true } },
    },
    orderBy: { ao: { createdAt: 'desc' } },
  })

  return <MesAOClient aoCompanies={aoCompanies} />
}
