import dotenv from 'dotenv'
dotenv.config()
import sequelize from './database.js'
import '../models/index.js'

async function migrate() {
  try {
    console.log('🔄 Running database migrations...')
    await sequelize.authenticate()
    // sync({ force: false }) — creates tables if not exist, never drops
    await sequelize.sync({ alter: true })
    console.log('✅ All tables created / updated successfully')
    console.log('\nTables created:')
    const [tables] = await sequelize.query('SHOW TABLES')
    tables.forEach(t => console.log('  •', Object.values(t)[0]))
    process.exit(0)
  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    process.exit(1)
  }
}

migrate()
