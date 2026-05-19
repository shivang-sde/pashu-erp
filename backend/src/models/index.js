import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

export const District = sequelize.define('District', {
  id:    { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:  { type: DataTypes.STRING(100), allowNull: false },
  state: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'Gujarat' },
  code:  { type: DataTypes.STRING(20),  allowNull: false, unique: true },
}, { tableName: 'districts' })

export const Hospital = sequelize.define('Hospital', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:        { type: DataTypes.STRING(200), allowNull: false },
  code:        { type: DataTypes.STRING(50),  allowNull: false, unique: true },
  address:     { type: DataTypes.TEXT },
  phone:       { type: DataTypes.STRING(20) },
  email:       { type: DataTypes.STRING(150) },
  district_id: { type: DataTypes.UUID, allowNull: false },
  type:        { type: DataTypes.ENUM('GOVERNMENT','PRIVATE'), defaultValue: 'GOVERNMENT' },
  status:      { type: DataTypes.ENUM('ACTIVE','INACTIVE'),    defaultValue: 'ACTIVE' },
}, { tableName: 'hospitals' })

export const User = sequelize.define('User', {
  id:                  { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:                { type: DataTypes.STRING(150), allowNull: false },
  email:               { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password:            { type: DataTypes.STRING(255), allowNull: false },
  role: {
    type: DataTypes.ENUM('STATE_ADMIN','DISTRICT_ADMIN','HOSPITAL_ADMIN','DOCTOR','PHARMACIST','RECEPTIONIST'),
    allowNull: false,
  },
  specializations:     { type: DataTypes.JSON, defaultValue: [] },
  specialization:      { type: DataTypes.STRING(150) },
  registration_number: { type: DataTypes.STRING(100) },
  hospital_id:         { type: DataTypes.UUID },
  district_id:         { type: DataTypes.UUID },
  avatar:              { type: DataTypes.STRING(255) },
  status:              { type: DataTypes.ENUM('ACTIVE','INACTIVE','SUSPENDED'), defaultValue: 'ACTIVE' },
  last_login:          { type: DataTypes.DATE },
}, {
  tableName: 'users',
  defaultScope: { attributes: { exclude: ['password'] } },
  scopes:       { withPassword: { attributes: { include: ['password'] } } },
})

export const DoctorHospital = sequelize.define('DoctorHospital', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  doctor_id:   { type: DataTypes.UUID, allowNull: false },
  hospital_id: { type: DataTypes.UUID, allowNull: false },
  is_primary:  { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'doctor_hospitals', paranoid: false })

export const AnimalOwner = sequelize.define('AnimalOwner', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:        { type: DataTypes.STRING(150), allowNull: false },
  phone:       { type: DataTypes.STRING(20),  allowNull: false },
  email:       { type: DataTypes.STRING(150) },
  address:     { type: DataTypes.TEXT },
  village:     { type: DataTypes.STRING(100) },
  district_id: { type: DataTypes.UUID },
  aadhaar:     { type: DataTypes.STRING(255) },
  status:      { type: DataTypes.ENUM('ACTIVE','INACTIVE'), defaultValue: 'ACTIVE' },
}, { tableName: 'animal_owners' })

export const Animal = sequelize.define('Animal', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  animal_type: { type: DataTypes.ENUM('COW','BUFFALO','GOAT','DOG','CAMEL','HORSE','SHEEP','OTHER'), allowNull: false },
  breed:       { type: DataTypes.STRING(100) },
  name:        { type: DataTypes.STRING(100) },
  gender:      { type: DataTypes.ENUM('MALE','FEMALE','UNKNOWN'), defaultValue: 'UNKNOWN' },
  age_years:   { type: DataTypes.INTEGER },
  age_months:  { type: DataTypes.INTEGER },
  weight_kg:   { type: DataTypes.DECIMAL(6,2) },
  color:       { type: DataTypes.STRING(100) },
  ear_tag:     { type: DataTypes.STRING(100) },
  rfid_tag:    { type: DataTypes.STRING(100) },
  qr_code:     { type: DataTypes.STRING(255) },
  owner_id:    { type: DataTypes.UUID, allowNull: false },
  hospital_id: { type: DataTypes.UUID },
  status:      { type: DataTypes.ENUM('ACTIVE','DECEASED','TRANSFERRED'), defaultValue: 'ACTIVE' },
  notes:       { type: DataTypes.TEXT },
}, { tableName: 'animals' })

export const DiseaseHistory = sequelize.define('DiseaseHistory', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  animal_id:    { type: DataTypes.UUID, allowNull: false },
  disease_name: { type: DataTypes.STRING(200), allowNull: false },
  symptoms:     { type: DataTypes.TEXT },
  diagnosis:    { type: DataTypes.TEXT },
  treatment:    { type: DataTypes.TEXT },
  doctor_id:    { type: DataTypes.UUID },
  hospital_id:  { type: DataTypes.UUID },
  diagnosed_at: { type: DataTypes.DATEONLY },
  resolved_at:  { type: DataTypes.DATEONLY },
  status:       { type: DataTypes.ENUM('ACTIVE','RESOLVED','CHRONIC'), defaultValue: 'ACTIVE' },
}, { tableName: 'disease_history' })

export const VaccinationRecord = sequelize.define('VaccinationRecord', {
  id:                { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  animal_id:         { type: DataTypes.UUID, allowNull: false },
  vaccine_name:      { type: DataTypes.STRING(200), allowNull: false },
  disease_prevented: { type: DataTypes.STRING(200) },
  batch_number:      { type: DataTypes.STRING(100) },
  dose:              { type: DataTypes.STRING(50) },
  administered_by:   { type: DataTypes.UUID },
  hospital_id:       { type: DataTypes.UUID },
  vaccinated_at:     { type: DataTypes.DATEONLY, allowNull: false },
  next_due_at:       { type: DataTypes.DATEONLY },
  notes:             { type: DataTypes.TEXT },
}, { tableName: 'vaccination_records' })

export const Appointment = sequelize.define('Appointment', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  token_number:     { type: DataTypes.INTEGER },
  animal_id:        { type: DataTypes.UUID, allowNull: false },
  owner_id:         { type: DataTypes.UUID, allowNull: false },
  hospital_id:      { type: DataTypes.UUID, allowNull: false },
  doctor_id:        { type: DataTypes.UUID },
  appointment_date: { type: DataTypes.DATEONLY, allowNull: false },
  appointment_time: { type: DataTypes.STRING(10) },
  type:             { type: DataTypes.ENUM('REGULAR','EMERGENCY','FOLLOW_UP','VACCINATION'), defaultValue: 'REGULAR' },
  status:           { type: DataTypes.ENUM('PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW'), defaultValue: 'PENDING' },
  chief_complaint:  { type: DataTypes.TEXT },
  notes:            { type: DataTypes.TEXT },
  booked_by:        { type: DataTypes.UUID },
  cancelled_by:     { type: DataTypes.UUID },
  cancel_reason:    { type: DataTypes.TEXT },
}, { tableName: 'appointments' })

// ─────────────────────────────────────────────
// Medicine Master
// ─────────────────────────────────────────────
export const Medicine = sequelize.define('Medicine', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:         { type: DataTypes.STRING(200), allowNull: false },
  generic_name: { type: DataTypes.STRING(200) },
  category: {
    type: DataTypes.ENUM('TABLET','CAPSULE','INJECTION','SYRUP','OINTMENT',
                         'POWDER','VACCINE','SURGICAL','OTHER'),
    defaultValue: 'TABLET',
  },
  unit:            { type: DataTypes.STRING(50),  defaultValue: 'Strip' },
  manufacturer:    { type: DataTypes.STRING(200) },
  description:     { type: DataTypes.TEXT },
  min_stock_level: { type: DataTypes.INTEGER, defaultValue: 10 },
  status:          { type: DataTypes.ENUM('ACTIVE','INACTIVE'), defaultValue: 'ACTIVE' },
}, { tableName: 'medicines' })

// ─────────────────────────────────────────────
// Medicine Batch (stock per hospital per batch)
// ─────────────────────────────────────────────
export const MedicineBatch = sequelize.define('MedicineBatch', {
  id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  medicine_id:      { type: DataTypes.UUID, allowNull: false },
  hospital_id:      { type: DataTypes.UUID, allowNull: false },
  batch_number:     { type: DataTypes.STRING(100), allowNull: false },
  quantity:         { type: DataTypes.INTEGER, defaultValue: 0 },
  unit_price:       { type: DataTypes.DECIMAL(10,2) },
  expiry_date:      { type: DataTypes.DATEONLY, allowNull: false },
  manufacture_date: { type: DataTypes.DATEONLY },
  supplier:         { type: DataTypes.STRING(200) },
  received_date:    { type: DataTypes.DATEONLY },
  received_by:      { type: DataTypes.UUID },
  status:           { type: DataTypes.ENUM('ACTIVE','EXPIRED','EXHAUSTED'), defaultValue: 'ACTIVE' },
}, { tableName: 'medicine_batches' })

// ─────────────────────────────────────────────
// Stock Movement (audit trail of every change)
// ─────────────────────────────────────────────
export const StockMovement = sequelize.define('StockMovement', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  medicine_id:    { type: DataTypes.UUID, allowNull: false },
  batch_id:       { type: DataTypes.UUID },
  hospital_id:    { type: DataTypes.UUID, allowNull: false },
  type: {
    type: DataTypes.ENUM('IN','OUT','TRANSFER_IN','TRANSFER_OUT','ADJUSTMENT','DISPENSED','EXPIRED'),
    allowNull: false,
  },
  quantity:       { type: DataTypes.INTEGER, allowNull: false },
  reference_id:   { type: DataTypes.UUID },
  reference_type: { type: DataTypes.STRING(50) },
  from_hospital:  { type: DataTypes.UUID },
  to_hospital:    { type: DataTypes.UUID },
  notes:          { type: DataTypes.TEXT },
  performed_by:   { type: DataTypes.UUID },
}, { tableName: 'stock_movements', paranoid: false, updatedAt: false })


// ─────────────────────────────────────────────
// InventoryItem
// ─────────────────────────────────────────────
export const InventoryItem = sequelize.define('InventoryItem', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:            { type: DataTypes.STRING(200), allowNull: false },
  code:            { type: DataTypes.STRING(100), unique: true },
  category: {
    type: DataTypes.ENUM('SURGICAL','EQUIPMENT','CONSUMABLE','VACCINE','DISINFECTANT','PPE','OTHER'),
    allowNull: false,
  },
  unit:            { type: DataTypes.STRING(50),  defaultValue: 'Piece' },
  manufacturer:    { type: DataTypes.STRING(200) },
  description:     { type: DataTypes.TEXT },
  min_stock_level: { type: DataTypes.INTEGER, defaultValue: 5 },
  status:          { type: DataTypes.ENUM('ACTIVE','INACTIVE'), defaultValue: 'ACTIVE' },
}, { tableName: 'inventory_items' })

// ─────────────────────────────────────────────
// InventoryStock
// ─────────────────────────────────────────────
export const InventoryStock = sequelize.define('InventoryStock', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  item_id:      { type: DataTypes.UUID, allowNull: false },
  hospital_id:  { type: DataTypes.UUID, allowNull: false },
  quantity:     { type: DataTypes.INTEGER, defaultValue: 0 },
  batch_number: { type: DataTypes.STRING(100) },
  expiry_date:  { type: DataTypes.DATEONLY },
  unit_cost:    { type: DataTypes.DECIMAL(10,2) },
  supplier:     { type: DataTypes.STRING(200) },
}, { tableName: 'inventory_stock' })

// ─────────────────────────────────────────────
// InventoryMovement
// ─────────────────────────────────────────────
export const InventoryMovement = sequelize.define('InventoryMovement', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  item_id:        { type: DataTypes.UUID, allowNull: false },
  stock_id:       { type: DataTypes.UUID },
  hospital_id:    { type: DataTypes.UUID, allowNull: false },
  type: {
    type: DataTypes.ENUM('IN','OUT','TRANSFER_IN','TRANSFER_OUT','ADJUSTMENT','EXPIRED'),
    allowNull: false,
  },
  quantity:       { type: DataTypes.INTEGER, allowNull: false },
  batch_number:   { type: DataTypes.STRING(100) },
  unit_cost:      { type: DataTypes.DECIMAL(10,2) },
  supplier:       { type: DataTypes.STRING(200) },
  reference_id:   { type: DataTypes.UUID },
  reference_type: { type: DataTypes.STRING(50) },
  from_hospital:  { type: DataTypes.UUID },
  to_hospital:    { type: DataTypes.UUID },
  notes:          { type: DataTypes.TEXT },
  performed_by:   { type: DataTypes.UUID },
}, { tableName: 'inventory_movements', paranoid: false, updatedAt: false })


// ─────────────────────────────────────────────
// Bill
// ─────────────────────────────────────────────
export const Bill = sequelize.define('Bill', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  bill_number:     { type: DataTypes.STRING(50), allowNull: false, unique: true },
  owner_id:        { type: DataTypes.UUID, allowNull: false },
  animal_id:       { type: DataTypes.UUID },
  hospital_id:     { type: DataTypes.UUID, allowNull: false },
  appointment_id:  { type: DataTypes.UUID },
  bill_type: {
    type: DataTypes.ENUM('OPD','MEDICINE','SURGERY','LABORATORY','VACCINATION','OTHER'),
    defaultValue: 'OPD',
  },
  bill_date:       { type: DataTypes.DATEONLY, allowNull: false },
  payment_mode: {
    type: DataTypes.ENUM('CASH','UPI','CARD','GOVT_SUBSIDY','FREE','INSURANCE'),
    defaultValue: 'CASH',
  },
  status: {
    type: DataTypes.ENUM('PENDING','PAID','PARTIALLY_PAID','CANCELLED'),
    defaultValue: 'PENDING',
  },
  subtotal:        { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  tax_amount:      { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  discount_pct:    { type: DataTypes.DECIMAL(5,2),  defaultValue: 0 },
  discount_amount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  total_amount:    { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  paid_amount:     { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  transaction_id:  { type: DataTypes.STRING(200) },
  paid_at:         { type: DataTypes.DATE },
  notes:           { type: DataTypes.TEXT },
  created_by:      { type: DataTypes.UUID },
}, { tableName: 'bills' })

// ─────────────────────────────────────────────
// BillItem
// ─────────────────────────────────────────────
export const BillItem = sequelize.define('BillItem', {
  id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  bill_id:     { type: DataTypes.UUID, allowNull: false },
  item_name:   { type: DataTypes.STRING(200), allowNull: false },
  item_type: {
    type: DataTypes.ENUM('SERVICE','MEDICINE','PROCEDURE','CONSULTATION','OTHER'),
    defaultValue: 'SERVICE',
  },
  quantity:    { type: DataTypes.INTEGER, defaultValue: 1 },
  unit_price:  { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  tax_pct:     { type: DataTypes.DECIMAL(5,2),  defaultValue: 0 },
  amount:      { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  description: { type: DataTypes.TEXT },
}, { tableName: 'bill_items', paranoid: false })

export const RefreshToken = sequelize.define('RefreshToken', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id:    { type: DataTypes.UUID, allowNull: false },
  token:      { type: DataTypes.TEXT, allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  revoked:    { type: DataTypes.BOOLEAN, defaultValue: false },
  ip_address: { type: DataTypes.STRING(50) },
  user_agent: { type: DataTypes.STRING(255) },
}, { tableName: 'refresh_tokens', paranoid: false })

export const AuditLog = sequelize.define('AuditLog', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id:    { type: DataTypes.UUID },
  action:     { type: DataTypes.STRING(100), allowNull: false },
  table_name: { type: DataTypes.STRING(100) },
  record_id:  { type: DataTypes.STRING(150) },
  old_values: { type: DataTypes.JSON },
  new_values: { type: DataTypes.JSON },
  ip_address: { type: DataTypes.STRING(50) },
  user_agent: { type: DataTypes.STRING(255) },
}, { tableName: 'audit_logs', paranoid: false, updatedAt: false })

// ─────────────────────────────────────────────
// Associations
// ─────────────────────────────────────────────
District.hasMany(Hospital,   { foreignKey: 'district_id', as: 'hospitals' })
Hospital.belongsTo(District, { foreignKey: 'district_id', as: 'district' })
District.hasMany(User,       { foreignKey: 'district_id', as: 'users' })
User.belongsTo(District,     { foreignKey: 'district_id', as: 'district' })
Hospital.hasMany(User,       { foreignKey: 'hospital_id', as: 'staff' })
User.belongsTo(Hospital,     { foreignKey: 'hospital_id', as: 'hospital' })
User.belongsToMany(Hospital, { through: DoctorHospital, foreignKey: 'doctor_id',   as: 'assignedHospitals' })
Hospital.belongsToMany(User, { through: DoctorHospital, foreignKey: 'hospital_id', as: 'assignedDoctors' })

District.hasMany(AnimalOwner,   { foreignKey: 'district_id', as: 'owners' })
AnimalOwner.belongsTo(District, { foreignKey: 'district_id', as: 'district' })
AnimalOwner.hasMany(Animal,     { foreignKey: 'owner_id',    as: 'animals' })
Animal.belongsTo(AnimalOwner,   { foreignKey: 'owner_id',    as: 'owner' })
Hospital.hasMany(Animal,        { foreignKey: 'hospital_id', as: 'animals' })
Animal.belongsTo(Hospital,      { foreignKey: 'hospital_id', as: 'hospital' })
Animal.hasMany(DiseaseHistory,  { foreignKey: 'animal_id',   as: 'diseases' })
DiseaseHistory.belongsTo(Animal,{ foreignKey: 'animal_id',   as: 'animal' })
DiseaseHistory.belongsTo(User,  { foreignKey: 'doctor_id',   as: 'doctor' })
Animal.hasMany(VaccinationRecord,     { foreignKey: 'animal_id', as: 'vaccinations' })
VaccinationRecord.belongsTo(Animal,   { foreignKey: 'animal_id', as: 'animal' })
VaccinationRecord.belongsTo(User,     { foreignKey: 'administered_by', as: 'administrator' })

Appointment.belongsTo(Animal,     { foreignKey: 'animal_id',   as: 'animal' })
Appointment.belongsTo(AnimalOwner,{ foreignKey: 'owner_id',    as: 'owner' })
Appointment.belongsTo(Hospital,   { foreignKey: 'hospital_id', as: 'hospital' })
Appointment.belongsTo(User,       { foreignKey: 'doctor_id',   as: 'doctor',    constraints: false })
Appointment.belongsTo(User,       { foreignKey: 'booked_by',   as: 'bookedBy',  constraints: false })
Animal.hasMany(Appointment,       { foreignKey: 'animal_id',   as: 'appointments' })
Hospital.hasMany(Appointment,     { foreignKey: 'hospital_id', as: 'appointments' })

// Pharmacy associations
Medicine.hasMany(MedicineBatch,   { foreignKey: 'medicine_id', as: 'batches' })
MedicineBatch.belongsTo(Medicine, { foreignKey: 'medicine_id', as: 'medicine' })
Hospital.hasMany(MedicineBatch,   { foreignKey: 'hospital_id', as: 'medicineBatches' })
MedicineBatch.belongsTo(Hospital, { foreignKey: 'hospital_id', as: 'hospital' })
MedicineBatch.belongsTo(User,     { foreignKey: 'received_by', as: 'receiver', constraints: false })
Medicine.hasMany(StockMovement,   { foreignKey: 'medicine_id', as: 'movements' })
StockMovement.belongsTo(Medicine, { foreignKey: 'medicine_id', as: 'medicine' })
StockMovement.belongsTo(User,     { foreignKey: 'performed_by', as: 'performer', constraints: false })
Hospital.hasMany(StockMovement,   { foreignKey: 'hospital_id', as: 'stockMovements' })
MedicineBatch.hasMany(StockMovement, { foreignKey: 'batch_id', as: 'movements' })
StockMovement.belongsTo(MedicineBatch, { foreignKey: 'batch_id', as: 'batch', constraints: false })

User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' })
RefreshToken.belongsTo(User,{ foreignKey: 'user_id', as: 'user' })
User.hasMany(AuditLog,     { foreignKey: 'user_id', as: 'auditLogs' })
AuditLog.belongsTo(User,   { foreignKey: 'user_id', as: 'user' })


// Inventory associations
InventoryItem.hasMany(InventoryStock,     { foreignKey: 'item_id',      as: 'stocks' })
InventoryStock.belongsTo(InventoryItem,   { foreignKey: 'item_id',      as: 'item' })
Hospital.hasMany(InventoryStock,          { foreignKey: 'hospital_id',  as: 'inventoryStock' })
InventoryStock.belongsTo(Hospital,        { foreignKey: 'hospital_id',  as: 'hospital' })
InventoryItem.hasMany(InventoryMovement,  { foreignKey: 'item_id',      as: 'movements' })
InventoryMovement.belongsTo(InventoryItem,{ foreignKey: 'item_id',      as: 'item' })
InventoryMovement.belongsTo(User,         { foreignKey: 'performed_by', as: 'performer', constraints: false })
InventoryStock.hasMany(InventoryMovement, { foreignKey: 'stock_id',     as: 'movements' })
InventoryMovement.belongsTo(InventoryStock,{ foreignKey: 'stock_id',    as: 'stock', constraints: false })


// Bill associations
Bill.belongsTo(AnimalOwner, { foreignKey: 'owner_id',    as: 'owner' })
Bill.belongsTo(Animal,      { foreignKey: 'animal_id',   as: 'animal',        constraints: false })
Bill.belongsTo(Hospital,    { foreignKey: 'hospital_id', as: 'hospital' })
Bill.belongsTo(User,        { foreignKey: 'created_by',  as: 'createdByUser', constraints: false })
Bill.hasMany(BillItem,      { foreignKey: 'bill_id',     as: 'items' })
BillItem.belongsTo(Bill,    { foreignKey: 'bill_id',     as: 'bill' })
AnimalOwner.hasMany(Bill,   { foreignKey: 'owner_id',    as: 'bills' })
Hospital.hasMany(Bill,      { foreignKey: 'hospital_id', as: 'bills' })


// Prescription
export const Prescription = sequelize.define('Prescription', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  appointment_id:  { type: DataTypes.UUID },
  animal_id:       { type: DataTypes.UUID, allowNull: false },
  owner_id:        { type: DataTypes.UUID, allowNull: false },
  doctor_id:       { type: DataTypes.UUID, allowNull: false },
  hospital_id:     { type: DataTypes.UUID, allowNull: false },
  diagnosis:       { type: DataTypes.TEXT },
  chief_complaint: { type: DataTypes.TEXT },
  notes:           { type: DataTypes.TEXT },
  follow_up_date:  { type: DataTypes.DATEONLY },
  status:          { type: DataTypes.ENUM('ACTIVE','COMPLETED','CANCELLED'), defaultValue: 'ACTIVE' },
  email_sent:      { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'prescriptions' })

export const PrescriptionItem = sequelize.define('PrescriptionItem', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  prescription_id: { type: DataTypes.UUID, allowNull: false },
  medicine_name:   { type: DataTypes.STRING(200), allowNull: false },
  medicine_id:     { type: DataTypes.UUID },
  dosage:          { type: DataTypes.STRING(100) },
  frequency:       { type: DataTypes.STRING(100) },
  duration:        { type: DataTypes.STRING(100) },
  route:           { type: DataTypes.STRING(50) },
  instructions:    { type: DataTypes.TEXT },
  quantity:        { type: DataTypes.INTEGER },
}, { tableName: 'prescription_items', paranoid: false })

// Prescription associations
Prescription.belongsTo(Animal,      { foreignKey: 'animal_id',      as: 'animal' })
Prescription.belongsTo(AnimalOwner, { foreignKey: 'owner_id',       as: 'owner' })
Prescription.belongsTo(User,        { foreignKey: 'doctor_id',      as: 'doctor',      constraints: false })
Prescription.belongsTo(Hospital,    { foreignKey: 'hospital_id',    as: 'hospital' })
Prescription.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment', constraints: false })
Prescription.hasMany(PrescriptionItem,   { foreignKey: 'prescription_id', as: 'items' })
PrescriptionItem.belongsTo(Prescription, { foreignKey: 'prescription_id', as: 'prescription' })
Animal.hasMany(Prescription, { foreignKey: 'animal_id', as: 'prescriptions' })

export default {
  District, Hospital, User, DoctorHospital,
  AnimalOwner, Animal, DiseaseHistory, VaccinationRecord,
  Appointment, Medicine, MedicineBatch, StockMovement,
  InventoryItem, InventoryStock, InventoryMovement,
  Bill, BillItem,
  RefreshToken, AuditLog,
  Prescription, PrescriptionItem,
}
