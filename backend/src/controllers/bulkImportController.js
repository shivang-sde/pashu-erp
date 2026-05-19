import bcrypt from 'bcryptjs'
import { Op } from 'sequelize'
import sequelize from '../config/database.js'
import {
  User, Hospital, District, DoctorHospital,
  Animal, AnimalOwner, Medicine, MedicineBatch, StockMovement,
} from '../models/index.js'
import { createAuditLog } from '../middleware/auditLog.js'

// ── helpers ──────────────────────────────────────────────────
function clean(v) {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}
function cleanNum(v, def = 0) {
  const n = parseFloat(v)
  return isNaN(n) ? def : n
}
function cleanInt(v, def = 0) {
  const n = parseInt(v)
  return isNaN(n) ? def : n
}

// ── GET /api/v1/bulk/template/:type ─────────────────────────
// Returns JSON schema for the template so frontend can generate Excel
export async function getTemplate(req, res) {
  const TEMPLATES = {
    doctors: {
      name: 'Doctors Import Template',
      columns: [
        { key:'name',                label:'Full Name',           required:true,  example:'Dr. Ravi Patel' },
        { key:'email',               label:'Email',               required:true,  example:'ravi@hospital.in' },
        { key:'password',            label:'Password',            required:true,  example:'Doctor@123' },
        { key:'registration_number', label:'Registration No.',    required:false, example:'VCI-GUJ-12345' },
        { key:'specializations',     label:'Specializations',     required:false, example:'Large Animals,Surgery' },
        { key:'hospital_code',       label:'Hospital Code',       required:true,  example:'PVHC-AMD-001' },
        { key:'status',              label:'Status',              required:false, example:'ACTIVE' },
      ],
      notes: [
        'specializations: comma-separated e.g. "Large Animals,Surgery"',
        'hospital_code: must match an existing hospital code',
        'status: ACTIVE or INACTIVE (default ACTIVE)',
      ],
    },
    animals: {
      name: 'Animal Patients Import Template',
      columns: [
        { key:'animal_type',   label:'Animal Type',   required:true,  example:'COW' },
        { key:'breed',         label:'Breed',         required:false, example:'Gir' },
        { key:'name',          label:'Pet Name',      required:false, example:'Nandi' },
        { key:'gender',        label:'Gender',        required:false, example:'FEMALE' },
        { key:'age_years',     label:'Age (Years)',   required:false, example:'3' },
        { key:'age_months',    label:'Age (Months)',  required:false, example:'6' },
        { key:'weight_kg',     label:'Weight (kg)',   required:false, example:'250' },
        { key:'color',         label:'Color',         required:false, example:'Brown & White' },
        { key:'ear_tag',       label:'Ear Tag',       required:false, example:'GJ-AMD-001' },
        { key:'owner_name',    label:'Owner Name',    required:true,  example:'Ramesh Patel' },
        { key:'owner_phone',   label:'Owner Phone',   required:true,  example:'9876543210' },
        { key:'owner_village', label:'Owner Village', required:false, example:'Bavla' },
        { key:'hospital_code', label:'Hospital Code', required:false, example:'PVHC-AMD-001' },
      ],
      notes: [
        'animal_type: COW, BUFFALO, GOAT, DOG, CAMEL, HORSE, SHEEP, OTHER',
        'gender: MALE, FEMALE, UNKNOWN (default UNKNOWN)',
        'owner_phone: if phone exists, animal will be linked to existing owner',
      ],
    },
    medicines: {
      name: 'Medicines Import Template',
      columns: [
        { key:'name',            label:'Medicine Name',   required:true,  example:'Oxytocin Injection' },
        { key:'generic_name',    label:'Generic Name',    required:false, example:'Oxytocin' },
        { key:'category',        label:'Category',        required:true,  example:'INJECTION' },
        { key:'unit',            label:'Unit',            required:false, example:'Vial' },
        { key:'manufacturer',    label:'Manufacturer',    required:false, example:'Noven Pharma' },
        { key:'min_stock_level', label:'Min Stock Level', required:false, example:'10' },
        { key:'description',     label:'Description',     required:false, example:'Used for parturition' },
      ],
      notes: [
        'category: TABLET, CAPSULE, INJECTION, SYRUP, OINTMENT, POWDER, VACCINE, SURGICAL, OTHER',
        'min_stock_level: alert threshold (default 10)',
      ],
    },
    stock: {
      name: 'Medicine Stock Import Template',
      columns: [
        { key:'medicine_name',  label:'Medicine Name',  required:true,  example:'Oxytocin Injection' },
        { key:'hospital_code',  label:'Hospital Code',  required:true,  example:'PVHC-AMD-001' },
        { key:'batch_number',   label:'Batch Number',   required:true,  example:'BT2024001' },
        { key:'quantity',       label:'Quantity',       required:true,  example:'100' },
        { key:'expiry_date',    label:'Expiry Date',    required:true,  example:'2026-12-31' },
        { key:'unit_price',     label:'Unit Price (₹)', required:false, example:'50' },
        { key:'supplier',       label:'Supplier',       required:false, example:'ABC Pharma' },
        { key:'received_date',  label:'Received Date',  required:false, example:'2024-01-15' },
      ],
      notes: [
        'medicine_name: must match an existing medicine name exactly',
        'expiry_date: format YYYY-MM-DD',
        'received_date: format YYYY-MM-DD (default today)',
      ],
    },
  }

  const template = TEMPLATES[req.params.type]
  if (!template) return res.status(404).json({ success: false, message: 'Unknown template type' })
  res.json({ success: true, data: template })
}

// ── POST /api/v1/bulk/validate ───────────────────────────────
// Validate rows without importing — returns preview with errors
export async function validate(req, res) {
  try {
    const { type, rows } = req.body
    if (!type || !rows?.length) return res.status(400).json({ success: false, message: 'Type and rows are required' })

    const results = await validateRows(type, rows, req.user)
    const valid   = results.filter(r => r.status === 'ok').length
    const errors  = results.filter(r => r.status === 'error').length

    res.json({ success: true, data: { results, summary: { total: rows.length, valid, errors } } })
  } catch (err) {
    console.error('Bulk validate error:', err)
    res.status(500).json({ success: false, message: 'Validation failed' })
  }
}

// ── POST /api/v1/bulk/import ─────────────────────────────────
export async function importRows(req, res) {
  try {
    const { type, rows } = req.body
    if (!type || !rows?.length) return res.status(400).json({ success: false, message: 'Type and rows are required' })

    const results = await validateRows(type, rows, req.user)
    const validRows = results.filter(r => r.status === 'ok')

    if (!validRows.length) {
      return res.status(400).json({ success: false, message: 'No valid rows to import', data: { results } })
    }

    let imported = 0
    const importErrors = []

    for (const result of validRows) {
      try {
        await insertRow(type, result.normalized, req.user)
        imported++
      } catch (err) {
        importErrors.push({ row: result.row, error: err.message })
      }
    }

    await createAuditLog({
      userId: req.user.id, action: `BULK_IMPORT_${type.toUpperCase()}`,
      tableName: type, newValues: { imported, total: rows.length }, req,
    })

    res.json({
      success: true,
      data: { imported, failed: importErrors.length, errors: importErrors },
      message: `Successfully imported ${imported} of ${rows.length} rows`,
    })
  } catch (err) {
    console.error('Bulk import error:', err)
    res.status(500).json({ success: false, message: 'Import failed' })
  }
}

// ── validateRows ─────────────────────────────────────────────
async function validateRows(type, rows, user) {
  // Build lookup maps for performance
  const [hospitals, medicines] = await Promise.all([
    Hospital.findAll({ attributes: ['id','name','code'], raw: true }),
    Medicine.findAll({ attributes: ['id','name'], raw: true }),
  ])
  const hospitalByCode = {}
  hospitals.forEach(h => { hospitalByCode[h.code.toUpperCase()] = h })
  const medicineByName = {}
  medicines.forEach(m => { medicineByName[m.name.toLowerCase()] = m })

  const results = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const errors = []
    const normalized = {}

    if (type === 'doctors') {
      if (!clean(row.name))  errors.push('Name is required')
      if (!clean(row.email)) errors.push('Email is required')
      else {
        const exists = await User.findOne({ where: { email: clean(row.email).toLowerCase() } })
        if (exists) errors.push(`Email "${row.email}" already registered`)
      }
      if (!clean(row.password)) errors.push('Password is required')
      if (!clean(row.hospital_code)) errors.push('Hospital code is required')
      else {
        const h = hospitalByCode[clean(row.hospital_code).toUpperCase()]
        if (!h) errors.push(`Hospital code "${row.hospital_code}" not found`)
        else normalized.hospital = h
      }
      normalized.name                = clean(row.name)
      normalized.email               = clean(row.email).toLowerCase()
      normalized.password            = clean(row.password)
      normalized.registration_number = clean(row.registration_number) || null
      normalized.specializations     = clean(row.specializations) ? clean(row.specializations).split(',').map(s=>s.trim()) : []
      normalized.status              = ['ACTIVE','INACTIVE'].includes(clean(row.status).toUpperCase()) ? clean(row.status).toUpperCase() : 'ACTIVE'
    }

    else if (type === 'animals') {
      const VALID_TYPES = ['COW','BUFFALO','GOAT','DOG','CAMEL','HORSE','SHEEP','OTHER']
      const aType = clean(row.animal_type).toUpperCase()
      if (!aType) errors.push('Animal type is required')
      else if (!VALID_TYPES.includes(aType)) errors.push(`Invalid animal type "${row.animal_type}"`)
      if (!clean(row.owner_name))  errors.push('Owner name is required')
      if (!clean(row.owner_phone)) errors.push('Owner phone is required')
      if (clean(row.hospital_code)) {
        const h = hospitalByCode[clean(row.hospital_code).toUpperCase()]
        if (!h) errors.push(`Hospital code "${row.hospital_code}" not found`)
        else normalized.hospital = h
      }
      if (clean(row.ear_tag)) {
        const exists = await Animal.findOne({ where: { ear_tag: clean(row.ear_tag) } })
        if (exists) errors.push(`Ear tag "${row.ear_tag}" already registered`)
      }
      normalized.animal_type   = aType
      normalized.breed         = clean(row.breed)  || null
      normalized.name          = clean(row.name)   || null
      normalized.gender        = ['MALE','FEMALE','UNKNOWN'].includes(clean(row.gender).toUpperCase()) ? clean(row.gender).toUpperCase() : 'UNKNOWN'
      normalized.age_years     = cleanInt(row.age_years,  null)
      normalized.age_months    = cleanInt(row.age_months, null)
      normalized.weight_kg     = cleanNum(row.weight_kg,  null)
      normalized.color         = clean(row.color)  || null
      normalized.ear_tag       = clean(row.ear_tag)|| null
      normalized.owner_name    = clean(row.owner_name)
      normalized.owner_phone   = clean(row.owner_phone)
      normalized.owner_village = clean(row.owner_village) || null
    }

    else if (type === 'medicines') {
      const VALID_CATS = ['TABLET','CAPSULE','INJECTION','SYRUP','OINTMENT','POWDER','VACCINE','SURGICAL','OTHER']
      if (!clean(row.name)) errors.push('Medicine name is required')
      else {
        const exists = await Medicine.findOne({ where: { name: { [Op.like]: clean(row.name) } } })
        if (exists) errors.push(`Medicine "${row.name}" already exists`)
      }
      const cat = clean(row.category).toUpperCase()
      if (!cat) errors.push('Category is required')
      else if (!VALID_CATS.includes(cat)) errors.push(`Invalid category "${row.category}"`)
      normalized.name            = clean(row.name)
      normalized.generic_name    = clean(row.generic_name)    || null
      normalized.category        = cat
      normalized.unit            = clean(row.unit)            || 'Piece'
      normalized.manufacturer    = clean(row.manufacturer)    || null
      normalized.min_stock_level = cleanInt(row.min_stock_level, 10)
      normalized.description     = clean(row.description)     || null
    }

    else if (type === 'stock') {
      if (!clean(row.medicine_name)) errors.push('Medicine name is required')
      else {
        const m = medicineByName[clean(row.medicine_name).toLowerCase()]
        if (!m) errors.push(`Medicine "${row.medicine_name}" not found`)
        else normalized.medicine = m
      }
      if (!clean(row.hospital_code)) errors.push('Hospital code is required')
      else {
        const h = hospitalByCode[clean(row.hospital_code).toUpperCase()]
        if (!h) errors.push(`Hospital code "${row.hospital_code}" not found`)
        else normalized.hospital = h
      }
      if (!clean(row.batch_number)) errors.push('Batch number is required')
      if (!clean(row.quantity) || cleanInt(row.quantity, 0) <= 0) errors.push('Valid quantity required')
      if (!clean(row.expiry_date)) errors.push('Expiry date is required')
      else if (isNaN(new Date(row.expiry_date).getTime())) errors.push(`Invalid expiry date "${row.expiry_date}"`)
      normalized.batch_number  = clean(row.batch_number)
      normalized.quantity      = cleanInt(row.quantity, 0)
      normalized.expiry_date   = clean(row.expiry_date)
      normalized.unit_price    = cleanNum(row.unit_price, null)
      normalized.supplier      = clean(row.supplier)      || null
      normalized.received_date = clean(row.received_date) || new Date().toISOString().split('T')[0]
    }

    results.push({
      row: i + 1,
      data: row,
      normalized,
      status: errors.length ? 'error' : 'ok',
      errors,
    })
  }

  return results
}

// ── insertRow ────────────────────────────────────────────────
async function insertRow(type, norm, user) {
  if (type === 'doctors') {
    const hashed = await bcrypt.hash(norm.password, 12)
    const doctor = await User.create({
      name: norm.name, email: norm.email, password: hashed,
      role: 'DOCTOR', specializations: norm.specializations,
      registration_number: norm.registration_number,
      hospital_id: norm.hospital?.id || null,
      status: norm.status,
    })
    if (norm.hospital) {
      await DoctorHospital.create({ doctor_id: doctor.id, hospital_id: norm.hospital.id, is_primary: true })
    }
    return doctor
  }

  if (type === 'animals') {
    const [owner] = await AnimalOwner.findOrCreate({
      where: { phone: norm.owner_phone },
      defaults: { name: norm.owner_name, village: norm.owner_village },
    })
    return Animal.create({
      animal_type: norm.animal_type, breed: norm.breed, name: norm.name,
      gender: norm.gender, age_years: norm.age_years, age_months: norm.age_months,
      weight_kg: norm.weight_kg, color: norm.color, ear_tag: norm.ear_tag,
      owner_id: owner.id,
      hospital_id: norm.hospital?.id || user.hospital_id || null,
      status: 'ACTIVE',
    })
  }

  if (type === 'medicines') {
    return Medicine.create({
      name: norm.name, generic_name: norm.generic_name,
      category: norm.category, unit: norm.unit,
      manufacturer: norm.manufacturer,
      min_stock_level: norm.min_stock_level,
      description: norm.description, status: 'ACTIVE',
    })
  }

  if (type === 'stock') {
    let batch = await MedicineBatch.findOne({
      where: { medicine_id: norm.medicine.id, hospital_id: norm.hospital.id, batch_number: norm.batch_number },
    })
    if (batch) {
      await batch.update({ quantity: batch.quantity + norm.quantity })
    } else {
      batch = await MedicineBatch.create({
        medicine_id: norm.medicine.id, hospital_id: norm.hospital.id,
        batch_number: norm.batch_number, quantity: norm.quantity,
        expiry_date: norm.expiry_date, unit_price: norm.unit_price,
        supplier: norm.supplier,
        received_date: norm.received_date,
        received_by: user.id, status: 'ACTIVE',
      })
    }
    await StockMovement.create({
      medicine_id: norm.medicine.id, batch_id: batch.id,
      hospital_id: norm.hospital.id, type: 'IN',
      quantity: norm.quantity, performed_by: user.id,
      notes: 'Bulk import',
    })
    return batch
  }
}
