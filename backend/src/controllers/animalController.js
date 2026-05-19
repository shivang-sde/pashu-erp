import { Op } from 'sequelize'
import { Animal, AnimalOwner, DiseaseHistory, VaccinationRecord, Hospital, District, User } from '../models/index.js'
import { createAuditLog } from '../middleware/auditLog.js'

const ANIMAL_INCLUDE = [
  { model: AnimalOwner, as: 'owner',    attributes: ['id','name','phone','address','village'] },
  { model: Hospital,    as: 'hospital', attributes: ['id','name','code'], required: false },
]

// ── GET /api/v1/animals ─────────────────────────────────────
export async function list(req, res) {
  try {
    const { page=1, limit=10, search='', animal_type='', status='', hospital_id='' } = req.query

    const where = {}
    if (animal_type) where.animal_type = animal_type
    if (status)      where.status      = status

    // Role scoping
    if (req.user.role === 'HOSPITAL_ADMIN') where.hospital_id = req.user.hospital_id
    else if (hospital_id)                   where.hospital_id = hospital_id

    const offset = (parseInt(page)-1) * parseInt(limit)

    // Detect if search looks like a phone number
    const isPhoneSearch = search && /^[0-9+\- ]{6,}$/.test(search.trim())

    const { count, rows } = await Animal.findAndCountAll({
      where,
      include: [
        {
          model:      AnimalOwner,
          as:         'owner',
          attributes: ['id','name','phone','village','address','email'],
          required:   isPhoneSearch ? true : false,
          ...(search ? {
            where: {
              [Op.or]: [
                { name:  { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } },
              ]
            }
          } : {}),
        },
        { model: Hospital, as: 'hospital', attributes: ['id','name','code'], required: false },
      ],
      // If not a phone search, also match on animal fields
      ...(!isPhoneSearch && search ? {
        where: {
          ...where,
          [Op.or]: [
            { name:     { [Op.like]: `%${search}%` } },
            { breed:    { [Op.like]: `%${search}%` } },
            { ear_tag:  { [Op.like]: `%${search}%` } },
            { rfid_tag: { [Op.like]: `%${search}%` } },
            { '$owner.name$':  { [Op.like]: `%${search}%` } },
            { '$owner.phone$': { [Op.like]: `%${search}%` } },
          ]
        }
      } : {}),
      order:  [['created_at','DESC']],
      limit:  parseInt(limit),
      offset,
      distinct: true,
    })

    res.json({
      success: true,
      data: {
        animals: rows,
        pagination: { total:count, page:parseInt(page), limit:parseInt(limit), pages:Math.ceil(count/parseInt(limit)) },
      },
    })
  } catch (err) {
    console.error('Animal list error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch animals' })
  }
}

// ── GET /api/v1/animals/:id ─────────────────────────────────
export async function getOne(req, res) {
  try {
    const animal = await Animal.findByPk(req.params.id, {
      include: [
        { model: AnimalOwner, as: 'owner',        attributes: { exclude: ['aadhaar'] } },
        { model: Hospital,    as: 'hospital',     attributes: ['id','name','code'], required: false },
        { model: DiseaseHistory, as: 'diseases',
          include: [{ model: User, as: 'doctor', attributes: ['id','name'], required: false }],
          order: [['diagnosed_at','DESC']],
        },
        { model: VaccinationRecord, as: 'vaccinations',
          include: [{ model: User, as: 'administrator', attributes: ['id','name'], required: false }],
          order: [['vaccinated_at','DESC']],
        },
      ],
    })
    if (!animal) return res.status(404).json({ success: false, message: 'Animal not found' })
    res.json({ success: true, data: animal })
  } catch (err) {
    console.error('Animal get error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch animal' })
  }
}

// ── POST /api/v1/animals ────────────────────────────────────
export async function create(req, res) {
  try {
    const {
      // Owner
      owner_name, owner_phone, owner_email, owner_address, owner_village, owner_district_id,
      // Animal
      animal_type, breed, name, gender, age_years, age_months,
      weight_kg, color, ear_tag, rfid_tag, hospital_id, status, notes,
    } = req.body

    if (!animal_type) return res.status(400).json({ success: false, message: 'Animal type is required' })
    if (!owner_name || !owner_phone) return res.status(400).json({ success: false, message: 'Owner name and phone are required' })

    // Find or create owner by phone
    const [owner] = await AnimalOwner.findOrCreate({
      where: { phone: owner_phone.trim() },
      defaults: {
        name:        owner_name.trim(),
        email:       owner_email   || null,
        address:     owner_address || null,
        village:     owner_village || null,
        district_id: owner_district_id || null,
      },
    })

    // Check ear_tag uniqueness
    if (ear_tag) {
      const existing = await Animal.findOne({ where: { ear_tag } })
      if (existing) return res.status(409).json({ success: false, message: `Ear tag "${ear_tag}" already registered` })
    }

    const hId = hospital_id || req.user.hospital_id || null

    const animal = await Animal.create({
      animal_type, breed, name, gender,
      age_years:  age_years  || null,
      age_months: age_months || null,
      weight_kg:  weight_kg  || null,
      color, ear_tag, rfid_tag,
      owner_id:    owner.id,
      hospital_id: hId,
      status:      status || 'ACTIVE',
      notes,
    })

    await createAuditLog({
      userId: req.user.id, action: 'CREATE_ANIMAL',
      tableName: 'animals', recordId: animal.id,
      newValues: { animal_type, owner_name, owner_phone, ear_tag }, req,
    })

    const result = await Animal.findByPk(animal.id, { include: ANIMAL_INCLUDE })
    res.status(201).json({ success: true, data: result, message: 'Animal registered successfully' })
  } catch (err) {
    console.error('Animal create error:', err)
    res.status(500).json({ success: false, message: 'Failed to register animal' })
  }
}

// ── PUT /api/v1/animals/:id ─────────────────────────────────
export async function update(req, res) {
  try {
    const animal = await Animal.findByPk(req.params.id)
    if (!animal) return res.status(404).json({ success: false, message: 'Animal not found' })

    const {
      animal_type, breed, name, gender, age_years, age_months,
      weight_kg, color, ear_tag, rfid_tag, hospital_id, status, notes,
      owner_name, owner_phone, owner_address, owner_village,
    } = req.body

    const old = animal.toJSON()

    if (ear_tag && ear_tag !== animal.ear_tag) {
      const existing = await Animal.findOne({ where: { ear_tag } })
      if (existing) return res.status(409).json({ success: false, message: `Ear tag "${ear_tag}" already in use` })
    }

    // Update owner if provided
    if (owner_name || owner_phone) {
      await AnimalOwner.update(
        { name: owner_name, phone: owner_phone, address: owner_address, village: owner_village },
        { where: { id: animal.owner_id } }
      )
    }

    await animal.update({ animal_type, breed, name, gender, age_years, age_months, weight_kg, color, ear_tag, rfid_tag, hospital_id, status, notes })

    await createAuditLog({ userId: req.user.id, action: 'UPDATE_ANIMAL', tableName: 'animals', recordId: animal.id, oldValues: old, newValues: req.body, req })

    const result = await Animal.findByPk(animal.id, { include: ANIMAL_INCLUDE })
    res.json({ success: true, data: result, message: 'Animal updated successfully' })
  } catch (err) {
    console.error('Animal update error:', err)
    res.status(500).json({ success: false, message: 'Failed to update animal' })
  }
}

// ── DELETE /api/v1/animals/:id ──────────────────────────────
export async function remove(req, res) {
  try {
    const animal = await Animal.findByPk(req.params.id)
    if (!animal) return res.status(404).json({ success: false, message: 'Animal not found' })
    await createAuditLog({ userId: req.user.id, action: 'DELETE_ANIMAL', tableName: 'animals', recordId: animal.id, oldValues: animal.toJSON(), req })
    await animal.destroy()
    res.json({ success: true, message: 'Animal record deleted' })
  } catch (err) {
    console.error('Animal delete error:', err)
    res.status(500).json({ success: false, message: 'Failed to delete animal' })
  }
}

// ── POST /api/v1/animals/:id/diseases ──────────────────────
export async function addDisease(req, res) {
  try {
    const animal = await Animal.findByPk(req.params.id)
    if (!animal) return res.status(404).json({ success: false, message: 'Animal not found' })

    const { disease_name, symptoms, diagnosis, treatment, diagnosed_at, resolved_at, status } = req.body
    if (!disease_name) return res.status(400).json({ success: false, message: 'Disease name is required' })

    const record = await DiseaseHistory.create({
      animal_id:    animal.id,
      disease_name, symptoms, diagnosis, treatment,
      doctor_id:    req.user.role === 'DOCTOR' ? req.user.id : null,
      hospital_id:  animal.hospital_id,
      diagnosed_at: diagnosed_at || new Date(),
      resolved_at:  resolved_at  || null,
      status:       status || 'ACTIVE',
    })

    res.status(201).json({ success: true, data: record, message: 'Disease record added' })
  } catch (err) {
    console.error('Disease add error:', err)
    res.status(500).json({ success: false, message: 'Failed to add disease record' })
  }
}

// ── POST /api/v1/animals/:id/vaccinations ──────────────────
export async function addVaccination(req, res) {
  try {
    const animal = await Animal.findByPk(req.params.id)
    if (!animal) return res.status(404).json({ success: false, message: 'Animal not found' })

    const { vaccine_name, disease_prevented, batch_number, dose, vaccinated_at, next_due_at, notes } = req.body
    if (!vaccine_name || !vaccinated_at) return res.status(400).json({ success: false, message: 'Vaccine name and date are required' })

    const record = await VaccinationRecord.create({
      animal_id:        animal.id,
      vaccine_name, disease_prevented, batch_number, dose,
      administered_by:  req.user.role === 'DOCTOR' ? req.user.id : null,
      hospital_id:      animal.hospital_id,
      vaccinated_at, next_due_at, notes,
    })

    res.status(201).json({ success: true, data: record, message: 'Vaccination record added' })
  } catch (err) {
    console.error('Vaccination add error:', err)
    res.status(500).json({ success: false, message: 'Failed to add vaccination record' })
  }
}

// ── GET /api/v1/animals/stats ───────────────────────────────
export async function getStats(req, res) {
  try {
    const where = {}
    if (req.user.role === 'HOSPITAL_ADMIN') where.hospital_id = req.user.hospital_id

    const [total, byType] = await Promise.all([
      Animal.count({ where }),
      Animal.findAll({
        where,
        attributes: ['animal_type', [sequelize.fn('COUNT','*'), 'count']],
        group: ['animal_type'],
        raw: true,
      }),
    ])

    res.json({ success: true, data: { total, byType } })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' })
  }
}

import sequelize from '../config/database.js'
