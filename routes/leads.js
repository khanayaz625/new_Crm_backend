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

// Get metadata (Unique courses and colleges for filters)
router.get('/metadata', auth, async (req, res) => {
  try {
    const courses = await Lead.distinct('course');
    const colleges = await Lead.distinct('college');
    res.json({
      courses: courses.filter(Boolean).sort(),
      colleges: colleges.filter(Boolean).sort()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get stats (Counts for overview)
router.get('/stats', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'employee') query.assignedTo = req.user.id;

    const [total, pending, followUp, assigned, unassigned, won, called] = await Promise.all([
      Lead.countDocuments(query),
      Lead.countDocuments({ ...query, status: 'New' }),
      Lead.countDocuments({ ...query, status: 'Follow Up' }),
      Lead.countDocuments({ ...query, assignedTo: { $ne: null } }),
      Lead.countDocuments({ ...query, assignedTo: null }),
      Lead.countDocuments({ ...query, status: 'Won' }),
      Lead.countDocuments({ ...query, assignedTo: { $ne: null }, status: { $ne: 'New' } }),
    ]);

    res.json({ total, pending, followUp, assigned, unassigned, won, called });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all leads (Admin see all, Employee see assigned) with pagination and filters
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    let query = {};
    if (req.user.role === 'employee') {
      query.assignedTo = req.user.id;
    }

    // Apply Filters from query params
    if (req.query.status) query.status = req.query.status;
    if (req.query.course) query.course = req.query.course;
    if (req.query.college) query.college = req.query.college;
    if (req.query.employeeId) query.assignedTo = req.query.employeeId;
    
    if (req.query.assigned === 'assigned') {
      query.assignedTo = { $ne: null };
    } else if (req.query.assigned === 'unassigned') {
      query.assignedTo = null;
    }

    // Search logic (name or phone)
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Lead.countDocuments(query);

    res.json({
      leads,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
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

// Get call logs with pagination and filters
router.get('/logs', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    let query = {};
    if (req.user.role === 'employee') query.employeeId = req.user.id;
    
    // Filters
    if (req.query.status) query.status = req.query.status;
    if (req.query.employeeId && req.user.role === 'admin') query.employeeId = req.query.employeeId;
    
    // Date range filters
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
    }

    // Search logic (Lead name or phone)
    let leadMatch = {};
    if (req.query.search) {
      leadMatch = {
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { phone: { $regex: req.query.search, $options: 'i' } }
        ]
      };
    }

    // If searching by lead details, we might need a more complex aggregation or filter after population
    // For large datasets, it's better to use aggregation or filter by IDs
    let logs;
    let total;

    if (req.query.search) {
      // Find matching leads first
      const matchingLeads = await Lead.find(leadMatch).select('_id');
      const leadIds = matchingLeads.map(l => l._id);
      query.leadId = { $in: leadIds };
    }

    logs = await CallLog.find(query)
      .populate('leadId', 'name phone')
      .populate('employeeId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    total = await CallLog.countDocuments(query);

    res.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
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
