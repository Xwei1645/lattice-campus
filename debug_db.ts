import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const rooms = await prisma.room.findMany()
    const orgs = await prisma.organization.findMany()
    const bookings = await prisma.booking.findMany({ take: 5 })

    console.log('Rooms:', rooms.map(r => ({ id: r.id, name: r.name })))
    console.log('Orgs:', orgs.map(o => ({ id: o.id, name: o.name })))
    console.log('Bookings:', bookings)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
