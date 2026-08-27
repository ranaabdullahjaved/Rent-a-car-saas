import 'dotenv/config'
import { db, pgPool } from './client'
import { tenants, users, vehicles, customers, plans } from './schema'

async function seed() {
  console.log('🌱 Seeding development data...')

  const [tenant] = await db
    .insert(tenants)
    .values({
      name: 'Demo Rent-A-Car',
      slug: 'demo-rent-a-car',
      ownerName: 'Demo Owner',
      phone: '+92 300 0000000',
      email: 'owner@demo.local',
      city: 'Lahore',
    })
    .returning()

  if (!tenant) throw new Error('Failed to seed tenant')

  await db.insert(users).values({
    tenantId: tenant.id,
    name: 'Demo Admin',
    email: 'admin@demo.local',
    role: 'admin',
  })

  await db.insert(vehicles).values([
    {
      tenantId: tenant.id,
      registrationNo: 'LEA-01-1234',
      make: 'Toyota',
      model: 'Corolla',
      modelYear: 2022,
      transmission: 'automatic',
      fuelType: 'petrol',
    },
    {
      tenantId: tenant.id,
      registrationNo: 'LEB-02-5678',
      make: 'Honda',
      model: 'Civic',
      modelYear: 2023,
      transmission: 'automatic',
      fuelType: 'petrol',
    },
  ])

  await db.insert(customers).values({
    tenantId: tenant.id,
    fullName: 'Ali Raza',
    phone: '+92 301 1111111',
    city: 'Lahore',
  })

  await db.insert(plans).values([
    { code: 'starter', name: 'Starter', monthlyPrice: '5000.00', maxVehicles: 10, maxUsers: 3 },
    { code: 'growth', name: 'Growth', monthlyPrice: '12000.00', maxVehicles: 50, maxUsers: 10 },
  ])

  console.log(`✅ Seeded tenant "${tenant.slug}"`)
  await pgPool.end()
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
