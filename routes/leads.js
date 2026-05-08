const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const Lead = require('../models/Lead');
const CallLog = require('../models/CallLog');
const { auth, admin } = require('../middleware/auth');

const upload = multer({ dest: 'uploads/' });

// Get all leads (Admin see all, Employee see assigned)
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'employee') {
      query.assignedTo = req.user.id;
    }
    const leads = await Lead.find(query).populate('assignedTo', 'name');
    res.json(leads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Import leads from Excel or CSV
router.post('/import', [auth, admin, upload.single('file')], async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    let leads = [];
    if (file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      const workbook = xlsx.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      leads = xlsx.utils.sheet_to_json(sheet);
    } else if (file.originalname.endsWith('.csv')) {
      leads = await new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(file.path)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => resolve(results))
          .on('error', (err) => reject(err));
      });
    }

    // Clean up file
    fs.unlinkSync(file.path);

    // Save to DB (mapping fields if necessary)
    const formattedLeads = leads.map(l => ({
      name: l.Name || l.name || l['Student Name'] || l['Full Name'] || 'Unknown',
      email: l.Email || l.email || l['Email Address'],
      phone: String(l.Phone || l.phone || l['Mobile'] || l['Contact'] || '0000000000'),
      course: l.Course || l.course || l['Subject'],
      college: l.College || l.college || l['University'],
    }));

    await Lead.insertMany(formattedLeads);
    console.log(`Successfully imported ${formattedLeads.length} leads`);
    res.json({ message: `${formattedLeads.length} leads imported successfully` });

  } catch (err) {
    console.error('IMPORT ERROR:', err);
    res.status(500).json({ message: err.message });
  }
});

// Assign lead to employee
router.put('/assign/:id', [auth, admin], async (req, res) => {
  try {
    const { employeeId } = req.body;
    const lead = await Lead.findByIdAndUpdate(req.params.id, { assignedTo: employeeId }, { new: true });
    
    // Notify Employee
    const createNotification = require('../utils/notify');
    await createNotification(employeeId, 'New Lead Assigned', `You have been assigned a new lead: ${lead.name}`);

    res.json(lead);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Bulk assign leads
router.put('/bulk-assign', [auth, admin], async (req, res) => {
  try {
    const { leadIds, employeeId } = req.body;
    await Lead.updateMany(
      { _id: { $in: leadIds } },
      { $set: { assignedTo: employeeId } }
    );
    res.json({ message: 'Leads assigned successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Bulk delete leads
router.delete('/bulk-delete', [auth, admin], async (req, res) => {
  try {
    const { leadIds } = req.body;
    await Lead.deleteMany({ _id: { $in: leadIds } });
    res.json({ message: 'Leads deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update lead status and add remark (Creates a call log)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, remark } = req.body;
    
    // Update lead
    const lead = await Lead.findByIdAndUpdate(
      req.params.id, 
      { 
        status,
        $push: { notes: { text: remark, date: new Date() } }
      }, 
      { new: true }
    );

    // Create call log entry
    const log = new CallLog({
      leadId: lead._id,
      employeeId: req.user.id,
      status,
      remark
    });
    await log.save();

    res.json({ lead, log });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get call logs
router.get('/logs', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'employee') query.employeeId = req.user.id;
    
    const logs = await CallLog.find(query)
      .populate('leadId', 'name phone')
      .populate('employeeId', 'name')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete lead
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ message: 'Lead deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
