import { Op } from 'sequelize'
import {
  Animal, AnimalOwner, Hospital, User,
  Appointment, DiseaseHistory, VaccinationRecord,
  Bill, BillItem,
} from '../models/index.js'

// ── GET /api/v1/animals/:id/history ─────────────────────────
export async function getAnimalHistory(req, res) {
  try {
    const animal = await Animal.findByPk(req.params.id, {
      include: [
        { model: AnimalOwner, as: 'owner', attributes: { exclude: ['aadhaar'] } },
        { model: Hospital,    as: 'hospital', attributes: ['id','name','code','phone','address'], required: false },
      ],
    })
    if (!animal) return res.status(404).json({ success: false, message: 'Animal not found' })

    // All appointments with doctors and hospitals
    const appointments = await Appointment.findAll({
      where:   { animal_id: animal.id },
      include: [
        { model: Hospital, as: 'hospital', attributes: ['id','name','code'] },
        { model: User,     as: 'doctor',   attributes: ['id','name','specializations'], required: false },
        { model: User,     as: 'bookedBy', attributes: ['id','name','role'],            required: false },
      ],
      order: [['appointment_date','DESC'],['createdAt','DESC']],
    })

    // All disease history
    const diseases = await DiseaseHistory.findAll({
      where:   { animal_id: animal.id },
      include: [
        { model: User, as: 'doctor', attributes: ['id','name'], required: false },
      ],
      order: [['diagnosed_at','DESC']],
    })

    // All vaccinations
    const vaccinations = await VaccinationRecord.findAll({
      where:   { animal_id: animal.id },
      include: [
        { model: User, as: 'administrator', attributes: ['id','name'], required: false },
      ],
      order: [['vaccinated_at','DESC']],
    })

    // All bills
    const bills = await Bill.findAll({
      where:   { animal_id: animal.id },
      include: [
        { model: BillItem, as: 'items' },
        { model: Hospital, as: 'hospital', attributes: ['id','name'] },
        { model: User,     as: 'createdByUser', attributes: ['id','name'], required: false },
      ],
      order: [['bill_date','DESC']],
    })

    // Build unified timeline — merge all events by date
    const timeline = []

    appointments.forEach(a => timeline.push({
      date:  a.appointment_date,
      type:  'APPOINTMENT',
      data:  a,
    }))
    diseases.forEach(d => timeline.push({
      date:  d.diagnosed_at || d.created_at,
      type:  'DISEASE',
      data:  d,
    }))
    vaccinations.forEach(v => timeline.push({
      date:  v.vaccinated_at,
      type:  'VACCINATION',
      data:  v,
    }))
    bills.forEach(b => timeline.push({
      date:  b.bill_date,
      type:  'BILL',
      data:  b,
    }))

    // Sort timeline newest first
    timeline.sort((a, b) => {
      const da = new Date(a.date || '1970-01-01')
      const db = new Date(b.date || '1970-01-01')
      return db - da
    })

    // Stats
    const totalRevenue = bills
      .filter(b => b.status === 'PAID')
      .reduce((s, b) => s + parseFloat(b.total_amount || 0), 0)

    const uniqueHospitals = [...new Set(appointments.map(a => a.hospital?.name).filter(Boolean))]
    const uniqueDoctors   = [...new Set(appointments.map(a => a.doctor?.name).filter(Boolean))]

    const today    = new Date().toISOString().split('T')[0]
    const overdueVaccinations = vaccinations.filter(v => v.next_due_at && v.next_due_at < today)
    const upcomingVaccinations = vaccinations.filter(v => {
      if (!v.next_due_at) return false
      const days = Math.ceil((new Date(v.next_due_at) - new Date(today)) / (1000*60*60*24))
      return days >= 0 && days <= 30
    })

    res.json({
      success: true,
      data: {
        animal,
        timeline,
        stats: {
          totalVisits:      appointments.length,
          totalDiseases:    diseases.length,
          totalVaccinations:vaccinations.length,
          totalBills:       bills.length,
          totalRevenue,
          uniqueHospitals:  uniqueHospitals.length,
          uniqueDoctors:    uniqueDoctors.length,
          overdueVaccinations:  overdueVaccinations.length,
          upcomingVaccinations: upcomingVaccinations.length,
        },
        summary: {
          hospitals: uniqueHospitals,
          doctors:   uniqueDoctors,
          overdueVaccinations,
          upcomingVaccinations,
        },
        appointments,
        diseases,
        vaccinations,
        bills,
      },
    })
  } catch (err) {
    console.error('Animal history error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch animal history' })
  }
}
