import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'

config()

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Start seeding platforms...')
  
  const platforms = [
    {
      name: 'Zepto',
      slug: 'zepto',
      type: 'QUICK_COMMERCE',
      website: 'https://www.zeptonow.com/',
      active: true,
    },
    {
      name: 'Blinkit',
      slug: 'blinkit',
      type: 'QUICK_COMMERCE',
      website: 'https://blinkit.com/',
      active: true,
    },
    {
      name: 'BigBasket',
      slug: 'bigbasket',
      type: 'QUICK_COMMERCE',
      website: 'https://www.bigbasket.com/',
      active: true,
    },
    {
      name: 'Swiggy Instamart',
      slug: 'swiggy-instamart',
      type: 'QUICK_COMMERCE',
      website: 'https://www.swiggy.com/instamart',
      active: true,
    }
  ]

  for (const p of platforms) {
    const platform = await prisma.platform.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        name: p.name,
        slug: p.slug,
        type: p.type as 'QUICK_COMMERCE' | 'ECOMMERCE' | 'HYPERLOCAL',
        website: p.website,
        active: p.active
      },
    })
    console.log(`Upserted Platform: ${platform.name}`)
  }

  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
