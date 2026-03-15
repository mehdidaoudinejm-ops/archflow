import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProjectSettingsClient } from '@/components/dpgf/ProjectSettingsClient'

export default async function ProjectSettingsPage({ params }: { params: { projectId: string } }) {
  const user = await requireRole(['ARCHITECT', 'COLLABORATOR', 'ADMIN'])

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: { clientContact: true },
  })

  if (!project || project.agencyId !== user.agencyId) {
    redirect('/dashboard')
  }

  // Contacts CLIENT de l'agence pour la sélection
  const contacts = await prisma.contact.findMany({
    where: { agencyId: user.agencyId!, type: 'CLIENT' },
    orderBy: { firstName: 'asc' },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
  })

  return (
    <ProjectSettingsClient
      project={{
        id: project.id,
        name: project.name,
        address: project.address,
        projectType: project.projectType,
        surface: project.surface,
        budget: project.budget,
        startDate: project.startDate?.toISOString().split('T')[0] ?? null,
        description: project.description,
        clientContact: project.clientContact
          ? {
              id: project.clientContact.id,
              firstName: project.clientContact.firstName,
              lastName: project.clientContact.lastName,
              email: project.clientContact.email,
              phone: project.clientContact.phone,
            }
          : null,
        clientUserId: project.clientUserId,
      }}
      contacts={contacts.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
      }))}
    />
  )
}
