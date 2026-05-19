import dotenv from 'dotenv'
dotenv.config()
import bcrypt from 'bcryptjs'
import sequelize from './database.js'
import { seedDistricts } from './seedDistricts.js'
import { User, Hospital, District } from '../models/index.js'

async function seed() {
  try {
    console.log('🌱 Seeding database...')
    await sequelize.authenticate()

    // ── 1. Create districts ──────────────────────────────────
    const districts = await District.bulkCreate([
      { name: 'Ahmedabad',  state: 'Gujarat', code: 'AMD' },
      { name: 'Surat',      state: 'Gujarat', code: 'SRT' },
      { name: 'Vadodara',   state: 'Gujarat', code: 'VDR' },
      { name: 'Rajkot',     state: 'Gujarat', code: 'RJK' },
    ], { ignoreDuplicates: true })
    console.log('✅ Districts seeded')

    // ── 2. Create hospitals ──────────────────────────────────
    const [amdDistrict] = await District.findOrCreate({
      where: { code: 'AMD' },
      defaults: { name: 'Ahmedabad', state: 'Gujarat', code: 'AMD' }
    })

    const [hospital] = await Hospital.findOrCreate({
      where: { code: 'PVHC-AMD-001' },
      defaults: {
        name:        'Ahmedabad Pashu Veterinary Hospital',
        code:        'PVHC-AMD-001',
        address:     'Narol Road, Ahmedabad - 380024',
        phone:       '079-12345678',
        email:       'hospital@ahmedabad.gov.in',
        district_id: amdDistrict.id,
        type:        'GOVERNMENT',
        status:      'ACTIVE',
      }
    })
    console.log('✅ Hospital seeded')

    // ── 3. Create users ──────────────────────────────────────
    const hash = pw => bcrypt.hashSync(pw, 12)

    const users = [
      {
        name:        'Rajesh Kumar (IAS)',
        email:       'admin@pashu.gov.in',
        password:    hash('Admin@123'),
        role:        'STATE_ADMIN',
        status:      'ACTIVE',
      },
      {
        name:        'Priya Sharma',
        email:       'district@ahmedabad.gov.in',
        password:    hash('Admin@123'),
        role:        'DISTRICT_ADMIN',
        district_id: amdDistrict.id,
        status:      'ACTIVE',
      },
      {
        name:        'Suresh Patel',
        email:       'hospital@ahmedabad.gov.in',
        password:    hash('Admin@123'),
        role:        'HOSPITAL_ADMIN',
        hospital_id: hospital.id,
        district_id: amdDistrict.id,
        status:      'ACTIVE',
      },
      {
        name:        'Dr. Anil Mehta',
        email:       'doctor@ahmedabad.gov.in',
        password:    hash('Admin@123'),
        role:        'DOCTOR',
        hospital_id: hospital.id,
        district_id: amdDistrict.id,
        specialization: 'Large Animals',
        status:      'ACTIVE',
      },
      {
        name:        'Kavita Singh',
        email:       'pharma@ahmedabad.gov.in',
        password:    hash('Admin@123'),
        role:        'PHARMACIST',
        hospital_id: hospital.id,
        district_id: amdDistrict.id,
        status:      'ACTIVE',
      },
      {
        name:        'Ramesh Verma',
        email:       'reception@ahmedabad.gov.in',
        password:    hash('Admin@123'),
        role:        'RECEPTIONIST',
        hospital_id: hospital.id,
        district_id: amdDistrict.id,
        status:      'ACTIVE',
      },
    ]

    for (const u of users) {
      await User.findOrCreate({ where: { email: u.email }, defaults: u })
    }
    console.log('✅ Users seeded')

    console.log('\n🎉 Database seeded successfully!')
    console.log('\n📋 Login credentials (all use password: Admin@123):')
    console.log('  STATE_ADMIN     → admin@pashu.gov.in')
    console.log('  DISTRICT_ADMIN  → district@ahmedabad.gov.in')
    console.log('  HOSPITAL_ADMIN  → hospital@ahmedabad.gov.in')
    console.log('  DOCTOR          → doctor@ahmedabad.gov.in')
    console.log('  PHARMACIST      → pharma@ahmedabad.gov.in')
    console.log('  RECEPTIONIST    → reception@ahmedabad.gov.in')
    process.exit(0)
  } catch (err) {
    console.error('❌ Seeding failed:', err.message)
    process.exit(1)
  }
}

seed()
