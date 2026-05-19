import { Op, fn, col, literal } from 'sequelize'
import {
  User, Hospital, DoctorHospital, Appointment,
  Animal, AnimalOwner, DiseaseHistory, Bill,
  AuditLog,
} from '../models/index.js'

// ── GET /api/v1/doctors/:id/profile ─────────────────────────
export async function getDoctorProfile(req, res) {
  try {
    const doctorId = req.params.id

    const doctor = await User.findOne({
      where: { id: doctorId, role: 'DOCTOR' },
      attributes: ['id','name','email','role','specializations','specialization',
                   'registration_number','status','last_login','created_at'],
      include: [
        { model: Hospital, as: 'hospital', attributes: ['id','name','code'], required: false },
        {
          model:    Hospital,
          as:       'assignedHospitals',
          attributes: ['id','name','code'],
          through:  { attributes: ['is_primary'] },
          required: false,
        },
      ],
    })
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' })

    const today      = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const yearStart  = `${new Date().getFullYear()}-01-01`

    // ── Appointment stats ────────────────────────────────────
    const [
      totalAppts, completedAppts, pendingAppts, cancelledAppts,
      todayAppts, monthAppts, yearAppts, emergencyAppts,
    ] = await Promise.all([
      Appointment.count({ where: { doctor_id: doctorId } }),
      Appointment.count({ where: { doctor_id: doctorId, status: 'COMPLETED' } }),
      Appointment.count({ where: { doctor_id: doctorId, status: 'PENDING' } }),
      Appointment.count({ where: { doctor_id: doctorId, status: 'CANCELLED' } }),
      Appointment.count({ where: { doctor_id: doctorId, appointment_date: today } }),
      Appointment.count({ where: { doctor_id: doctorId, appointment_date: { [Op.gte]: monthStart } } }),
      Appointment.count({ where: { doctor_id: doctorId, appointment_date: { [Op.gte]: yearStart } } }),
      Appointment.count({ where: { doctor_id: doctorId, type: 'EMERGENCY' } }),
    ])

    // Unique patients (animals) seen
    const uniqueAnimals = await Appointment.count({
      where:    { doctor_id: doctorId },
      distinct: true,
      col:      'animal_id',
    })

    // ── Hospital visit history ───────────────────────────────
    // Which hospitals this doctor has attended appointments at, with counts
    const hospitalVisits = await Appointment.findAll({
      where:      { doctor_id: doctorId },
      attributes: [
        'hospital_id',
        [fn('COUNT', col('Appointment.id')), 'visit_count'],
        [fn('MAX',   col('appointment_date')), 'last_visit'],
        [fn('MIN',   col('appointment_date')), 'first_visit'],
      ],
      include: [{ model: Hospital, as: 'hospital', attributes: ['id','name','code'] }],
      group:   ['hospital_id', 'hospital.id', 'hospital.name', 'hospital.code'],
      order:   [[fn('COUNT', col('Appointment.id')), 'DESC']],
      raw: false,
    })

    // ── Monthly performance (last 12 months) ────────────────
    const monthlyPerformance = await Appointment.findAll({
      where: {
        doctor_id:        doctorId,
        appointment_date: { [Op.gte]: new Date(new Date().getFullYear()-1, new Date().getMonth()+1, 1).toISOString().split('T')[0] },
      },
      attributes: [
        [fn('YEAR',  col('appointment_date')), 'year'],
        [fn('MONTH', col('appointment_date')), 'month'],
        [fn('COUNT', col('id')), 'total'],
        [fn('SUM', literal("CASE WHEN status='COMPLETED' THEN 1 ELSE 0 END")), 'completed'],
      ],
      group:  [fn('YEAR', col('appointment_date')), fn('MONTH', col('appointment_date'))],
      order:  [[fn('YEAR', col('appointment_date')), 'ASC'], [fn('MONTH', col('appointment_date')), 'ASC']],
      raw: true,
    })

    // ── Disease records by this doctor ───────────────────────
    const diseaseStats = await DiseaseHistory.findAll({
      where:      { doctor_id: doctorId },
      attributes: ['disease_name', [fn('COUNT', col('id')), 'count']],
      group:      ['disease_name'],
      order:      [[fn('COUNT', col('id')), 'DESC']],
      limit:      10,
      raw: true,
    })

    const totalDiseases = await DiseaseHistory.count({ where: { doctor_id: doctorId } })

    // ── Recent appointments ──────────────────────────────────
    const recentAppts = await Appointment.findAll({
      where:   { doctor_id: doctorId },
      include: [
        { model: Animal,      as: 'animal', attributes: ['id','animal_type','breed','name','ear_tag'] },
        { model: AnimalOwner, as: 'owner',  attributes: ['id','name','phone','village'] },
        { model: Hospital,    as: 'hospital', attributes: ['id','name','code'] },
      ],
      order:  [['appointment_date','DESC'],['createdAt','DESC']],
      limit:  10,
    })

    // ── Login / activity history (from audit log) ────────────
    const loginHistory = await AuditLog.findAll({
      where: {
        user_id: doctorId,
        action:  { [Op.in]: ['LOGIN','LOGOUT','CREATE_APPOINTMENT','UPDATE_APPOINTMENT_STATUS'] },
      },
      order:  [['created_at','DESC']],
      limit:  20,
      raw: true,
    })

    // ── Billing contribution ─────────────────────────────────
    // Bills created by this doctor or for appointments with this doctor
    const billingAppts = await Appointment.findAll({
      where:      { doctor_id: doctorId, status: 'COMPLETED' },
      attributes: ['id'],
      raw: true,
    })
    const apptIds = billingAppts.map(a => a.id)

    const [totalBillsRelated, totalRevenueRelated] = await Promise.all([
      apptIds.length ? Bill.count({ where: { appointment_id: { [Op.in]: apptIds } } }) : Promise.resolve(0),
      apptIds.length ? Bill.sum('total_amount', { where: { appointment_id: { [Op.in]: apptIds }, status: 'PAID' } }) : Promise.resolve(0),
    ])

    // ── Animal type distribution ─────────────────────────────
    const animalTypeStats = await Appointment.findAll({
      where:   { doctor_id: doctorId },
      include: [{ model: Animal, as: 'animal', attributes: ['animal_type'] }],
      attributes: [],
      raw: false,
    }).then(appts => {
      const map = {}
      appts.forEach(a => {
        const t = a.animal?.animal_type || 'OTHER'
        map[t] = (map[t] || 0) + 1
      })
      return Object.entries(map).map(([animal_type, count]) => ({ animal_type, count })).sort((a,b) => b.count - a.count)
    })

    res.json({
      success: true,
      data: {
        doctor,
        stats: {
          totalAppts, completedAppts, pendingAppts, cancelledAppts,
          todayAppts, monthAppts, yearAppts, emergencyAppts,
          uniqueAnimals, totalDiseases,
          completionRate: totalAppts > 0 ? Math.round((completedAppts/totalAppts)*100) : 0,
          totalBillsRelated, totalRevenueRelated: totalRevenueRelated || 0,
        },
        hospitalVisits,
        monthlyPerformance,
        diseaseStats,
        animalTypeStats,
        recentAppts,
        loginHistory,
      },
    })
  } catch (err) {
    console.error('Doctor profile error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch doctor profile' })
  }
}
