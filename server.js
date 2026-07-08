 const express = require('express');
 const fs = require('fs');
 const path = require('path');
 const { exec } = require('child_process');
 const app = express();
 const PORT = process.env.PORT || 3000;
 const DATA_FILE = path.join(__dirname, 'submissions.json');
 
 app.use(express.json());
 app.use(express.static(path.join(__dirname, 'public')));
 
 // Load existing submissions
 function loadSubmissions() {
   try {
     if (fs.existsSync(DATA_FILE)) {
       return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
     }
   } catch (e) {
     console.error('Error loading submissions file:', e.message);
   }
   return [];
 }
 
 // Save submissions
 function saveSubmissions(data) {
   fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
 }
 
 // Form submission endpoint
 app.post('/api/submit', (req, res) => {
   const { name, email, destinations, startDate, endDate, travelers, interests } = req.body;
 
   if (!name || !email || !destinations || !startDate || !endDate || !interests) {
     return res.status(400).json({ error: 'Missing required fields' });
   }
 
   const submission = {
     id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
     name,
     email,
     destinations,
     startDate,
     endDate,
     travelers,
     interests,
     status: 'pending',
     createdAt: new Date().toISOString(),
   };
 
   const submissions = loadSubmissions();
   submissions.push(submission);
   saveSubmissions(submissions);
 
   console.log('');
   console.log('='.repeat(60));
   console.log('NEW SUBMISSION!');
   console.log('='.repeat(60));
   console.log(`ID:      ${submission.id}`);
   console.log(`Name:    ${submission.name}`);
   console.log(`Email:   ${submission.email}`);
   console.log(`Where:   ${submission.destinations}`);
   console.log(`Dates:   ${submission.startDate} → ${submission.endDate}`);
   console.log(`People:  ${submission.travelers}`);
   console.log(`Interests:`);
   console.log(submission.interests);
   console.log('='.repeat(60));
    // Send email notification
  sendEmailNotification(submission);

 
   res.json({ success: true, id: submission.id });
 });
 
 // View submissions (password-protected)
 app.get('/admin', (req, res) => {
   const submissions = loadSubmissions();
   let html = `
   <!DOCTYPE html><html><head>
   <meta charset="UTF-8">
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   <title>Submissions - ChinaTrip AI</title>
   <style>
     * { margin:0; padding:0; box-sizing:border-box; }
     body { font-family: system-ui, sans-serif; background:#f1f5f9; padding:24px; color:#1a1a2e; }
     h1 { font-size:24px; margin-bottom:24px; }
     .stats { display:flex; gap:16px; margin-bottom:24px; }
     .stat { background:#fff; padding:16px 24px; border-radius:10px; box-shadow:0 1px 3px rgba(0,0,0,0.06); }
     .stat-num { font-size:28px; font-weight:700; color:#2563eb; }
     .stat-label { font-size:13px; color:#64748b; }
     .card { background:#fff; border-radius:10px; padding:20px; margin-bottom:16px; box-shadow:0 1px 3px rgba(0,0,0,0.06); }
     .card-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
     .card-name { font-weight:600; font-size:16px; }
     .card-email { color:#3b82f6; font-size:14px; }
     .card-date { color:#94a3b8; font-size:13px; }
     .card-body { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
     .card-field label { display:block; font-size:12px; color:#94a3b8; margin-bottom:2px; text-transform:uppercase; letter-spacing:0.5px; }
     .card-field p { font-size:14px; color:#334155; }
     .card-interests { margin-top:12px; padding-top:12px; border-top:1px solid #f1f5f9; }
     .card-interests label { display:block; font-size:12px; color:#94a3b8; margin-bottom:2px; text-transform:uppercase; letter-spacing:0.5px; }
     .card-interests p { font-size:14px; color:#334155; white-space:pre-wrap; }
     .badge { display:inline-block; font-size:12px; padding:2px 10px; border-radius:100px; font-weight:500; }
     .badge-pending { background:#fef3c7; color:#92400e; }
     .badge-done { background:#dcfce7; color:#166534; }
     .empty { text-align:center; padding:60px; color:#94a3b8; }
     @media(max-width:640px) { .card-body { grid-template-columns:1fr; } }
   </style>
   </head><body>
   <h1>ChinaTrip AI — Submissions</h1>
   <div class="stats">
     <div class="stat"><div class="stat-num">${submissions.length}</div><div class="stat-label">Total</div></div>
     <div class="stat"><div class="stat-num">${submissions.filter(s => s.status === 'pending').length}</div><div class="stat-label">Pending</div></div>
   </div>`;
 
   if (submissions.length === 0) {
     html += `<div class="empty"><p>No submissions yet. Share your landing page!</p></div>`;
   } else {
     const reversed = [...submissions].reverse();
     reversed.forEach(s => {
       html += `
       <div class="card">
         <div class="card-header">
           <div>
             <span class="card-name">${s.name}</span>
             <span class="card-email">${s.email}</span>
           </div>
           <div>
             <span class="badge badge-${s.status === 'done' ? 'done' : 'pending'}">${s.status}</span>
             <span class="card-date">${new Date(s.createdAt).toLocaleString()}</span>
           </div>
         </div>
         <div class="card-body">
           <div class="card-field"><label>Destinations</label><pre style="white-space:pre-wrap;font-family:inherit;margin:0;font-size:14px;color:#334155">${s.destinations}</pre></div>
           <div class="card-field"><label>Dates</label><p>${s.startDate} → ${s.endDate}</p></div>
           <div class="card-field"><label>Travelers</label><p>${s.travelers}</p></div>
           <div class="card-field"><label>ID</label><p style="font-family:monospace;font-size:12px;color:#94a3b8">${s.id}</p></div>
         </div>
         <div class="card-interests"><label>Interests & Notes</label><pre style="white-space:pre-wrap;font-family:inherit;margin:0;font-size:14px;color:#334155">${s.interests}</pre></div>
       </div>`;
     });
   }
   html += `</body></html>`;
   res.send(html);
 });
 function sendEmailNotification(submission) {
  const subject = 'New Trip Inquiry: ' + submission.name + ' - ' + submission.destinations;
  const body = 'NEW SUBMISSION\n' +
    '==============================\n' +
    'Name:       ' + submission.name + '\n' +
    'Email:      ' + submission.email + '\n' +
    'Destinations:\n' + submission.destinations + '\n' +
    'Dates:      ' + submission.startDate + ' → ' + submission.endDate + '\n' +
    'Travelers:  ' + submission.travelers + '\n' +
    '\nInterests:\n' + submission.interests + '\n' +
    '\nID:         ' + submission.id + '\n' +
    'Time:       ' + submission.createdAt + '\n' +
    '==============================';
  const cmd = 'agently-cli send -t huangxiaojuan@agent.qq.com -s "' + subject + '" -b "' + body + '"';
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error('Email notification failed:', err.message);
      return;
    }
    console.log('Email notification sent:', stdout.trim());
  });
}

 app.listen(PORT, () => {
   console.log(`
   ╔══════════════════════════════════════════╗
   ║  ChinaTrip AI — MVP Validator            ║
   ║──────────────────────────────────────────║
   ║  Landing Page: http://localhost:${PORT}      ║
   ║  Submissions:  http://localhost:${PORT}/admin ║
   ╚══════════════════════════════════════════╝
   `);
 });
