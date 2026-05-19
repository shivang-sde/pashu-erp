import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'
dotenv.config()

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host:    process.env.DB_HOST || 'localhost',
    port:    parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle:    10000,
    },
    define: {
      timestamps:  true,
      underscored: true,
      paranoid:    true,  // soft deletes (deleted_at)
    },
  }
)

export async function connectDB() {
  try {
    await sequelize.authenticate()
    console.log('✅ MySQL connected successfully')
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message)
    console.error('   Check your .env DB_HOST, DB_USER, DB_PASSWORD, DB_NAME')
    process.exit(1)
  }
}

export default sequelize
