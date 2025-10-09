const API_BASE_URL = "https://goldlincschools.onrender.com";
const token = localStorage.getItem('teacherToken') || localStorage.getItem('token') || "";

// --- DATA HOLDERS ---
let teacher = null;
let studentsByClass = {};
let subjectsByClass = {};
let notifications = [];
let draftResults = [];
let attendanceRecords = [];
let gradebookData = {};
let assignments = [];
let cbts = [];

// --- INITIAL FETCH & SETUP ---
window.addEventListener('DOMContentLoaded', fetchAndSetup);
async function fetchTeacherCBTs() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacher.id)}/cbt`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    // Defensive: data may be array or {cbts:[...]}
    return Array.isArray(data) ? data : data.cbts || [];
  } catch { return []; }
}
async function fetchAndSetup() {
  teacher = await fetchTeacherProfile();
  if (!teacher) return alert("Failed to load teacher profile.");
  document.querySelector('.profile-section strong').textContent = teacher.name;
  document.querySelector('.profile-section small').textContent = teacher.designation || '';
  document.querySelector('header h1').textContent = `Welcome, ${teacher.name}`;
  document.querySelector('.avatar').textContent = (teacher.name || '').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  teacher.classes = await fetchTeacherClasses();
  notifications = await fetchTeacherNotifications();

  studentsByClass = {};
  subjectsByClass = {};
  for (const cls of teacher.classes) {
    studentsByClass[cls.id] = await fetchStudentsByClass(cls.id);
    subjectsByClass[cls.id] = await fetchSubjectsByClass(cls.id);
  }

  assignments = await fetchAssignments() || [];
  draftResults = await fetchDraftResults() || [];

  renderClassesList();
  renderStudentsBlock();
  renderSubjectsBlock();
  showAddSubjectBlock();
}
function populateAssignmentCBTs() {
  const cbtSel = document.getElementById('assignment-cbt');
  cbtSel.innerHTML = '<option value="">None (regular assignment)</option>';
  cbts.forEach(cbt => {
    let opt = document.createElement('option');
    opt.value = cbt._id;
    opt.innerText = `${cbt.title} (${cbt.className || ''} - ${cbt.subjectName || ''})`;
    cbtSel.appendChild(opt);
  });
}
// --- BACKEND API CALLS ---
function authHeaders() {
  return token ? { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token } : { 'Content-Type': 'application/json' };
}

async function fetchTeacherProfile() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/me`, { headers: authHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fetchTeacherClasses() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/classes`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function fetchTeacherNotifications() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacher.id)}/notifications`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.notifications) ? data.notifications : [];
  } catch { return []; }
}

async function fetchStudentsByClass(classId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/students?classId=${encodeURIComponent(classId)}`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function fetchSubjectsByClass(classId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/subjects?classId=${encodeURIComponent(classId)}`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function fetchAssignments() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacher.id)}/assignments`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.assignments) ? data.assignments : [];
  } catch { return []; }
}

async function fetchTeacherResults(status = "") {
  try {
    let url = `${API_BASE_URL}/api/teachers/${encodeURIComponent(teacher.id)}/results`;
    if (status) url += `?status=${encodeURIComponent(status)}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch { return []; }
}
// --- UI LOGIC ---
const sidebarBtns = document.querySelectorAll('.sidebar nav button');
const sections = {
  dashboard: document.getElementById('section-dashboard'),
  classes: document.getElementById('section-dashboard'),
  attendance: document.getElementById('section-attendance'),
  gradebook: document.getElementById('section-gradebook'),
  assignments: document.getElementById('section-assignments'),
  draftResults: document.getElementById('section-draftResults'),
  notifications: document.getElementById('section-notifications'),
  profile: document.getElementById('section-profile'),
  cbtQuestions: document.getElementById('section-cbtQuestions')   // <--- comma before this line!
};
sidebarBtns.forEach(btn => {
  btn.onclick = function () {
    sidebarBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    Object.values(sections).forEach(s => s.style.display = 'none');
    const sec = btn.getAttribute('data-section');
    sections[sec].style.display = '';
    if (sec === 'draftResults') renderDraftResults();
    if (sec === 'notifications') renderNotifications();
    if (sec === 'attendance') renderAttendance();
    if (sec === 'gradebook') renderGradebook();
    if (sec === 'assignments') renderAssignments();
if (sec === 'cbtQuestions') renderCBTQuestionSection();
    if (sec === 'dashboard' || sec === 'classes') {
      renderClassesList();
      renderStudentsBlock();
      renderSubjectsBlock();
      showAddSubjectBlock();
    }
  }
});

// Hamburger menu for sidebar (mobile)
function toggleSidebarMenu() {
  document.querySelector('.sidebar').classList.toggle('open');
}
function updateHamburger() {
  const hamburger = document.querySelector('.sidebar .hamburger');
  if (!hamburger) return;
  if (window.innerWidth <= 600) {
    hamburger.style.display = 'block';
  } else {
    hamburger.style.display = 'none';
    document.querySelector('.sidebar').classList.remove('open');
  }
}
window.addEventListener('resize', updateHamburger);
window.addEventListener('DOMContentLoaded', updateHamburger);

// --- Classes List ---
let selectedClassId = null;
function renderClassesList() {
  const classList = document.getElementById('class-list');
  classList.innerHTML = '';
  if (!teacher.classes || teacher.classes.length === 0) return;

  // Auto-select first class if none is selected
  if (!selectedClassId) {
    selectedClassId = teacher.classes[0].id;
  }

  teacher.classes.forEach(cls => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'class-btn';
    btn.innerText = cls.name;
    if (selectedClassId === cls.id) btn.classList.add('active');
    btn.onclick = () => {
      selectedClassId = cls.id;
      renderClassesList();
      renderStudentsBlock();
      renderSubjectsBlock();
      showAddSubjectBlock();
    };
    li.appendChild(btn);
    classList.appendChild(li);
  });

  renderStudentsBlock();
  renderSubjectsBlock();
  showAddSubjectBlock();
}

function renderStudentsBlock() {
  const block = document.getElementById('students-block');
  block.innerHTML = '';
  if (!selectedClassId) return;
  const students = studentsByClass[selectedClassId] || [];
  if (students.length === 0) {
    block.innerHTML = '<div class="card students-table"><em>No students found in this class.</em></div>';
    return;
  }
  let html = `<div class="card students-table"><h2>Students in ${teacher.classes.find(c => c.id === selectedClassId).name}</h2>
    <table>
      <thead><tr>
        <th>Name</th><th>Reg. No.</th><th>Email</th><th>Actions</th>
      </tr></thead>
      <tbody>`;
  students.forEach(stu => {
    html += `<tr>
      <td data-label="Name">${stu.name}</td>
      <td data-label="Reg. No.">${stu.regNo}</td>
      <td data-label="Email">${stu.email}</td>
      <td class="actions" data-label="Actions">
        <button class="btn" onclick="openResultModal('${stu.id}','${selectedClassId}')">Enter/Update Result</button>
        <button class="btn" onclick="alert('Profile for ${stu.name}')">View Profile</button>
      </td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  block.innerHTML = html;
}

function renderSubjectsBlock() {
  const block = document.getElementById('subjects-block');
  block.innerHTML = '';
  if (!selectedClassId) return;
  const subjects = subjectsByClass[selectedClassId] || [];
  if (subjects.length === 0) {
    block.innerHTML = '<div class="card"><em>No subjects found for this class.</em></div>';
    return;
  }
  let html = `<div class="card"><h2>Subjects for ${teacher.classes.find(c => c.id === selectedClassId).name}</h2><ul>`;
  subjects.forEach(subj => {
    // Handles both object and string
    html += `<li>${subj.name || subj}</li>`;
  });
  html += '</ul></div>';
  block.innerHTML = html;
}

// --- Add Subject to Class ---
function showAddSubjectBlock() {
  const block = document.getElementById('add-subject-block');
  if (!block) return;
  if (selectedClassId) {
    block.style.display = '';
  } else {
    block.style.display = 'none';
  }
}

// Attach event listener for adding a subject
const addSubjectForm = document.getElementById('add-subject-form');
if (addSubjectForm) {
  addSubjectForm.onsubmit = async function(e) {
    e.preventDefault();
    const subjectInput = document.getElementById('subject-name-input');
    const subjectName = subjectInput.value.trim();
    if (!subjectName || !selectedClassId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/classes/${selectedClassId}/subjects`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ subjectName })
      });
      if (!res.ok) throw new Error();
      // Always refetch to update UI with latest format
      subjectsByClass[selectedClassId] = await fetchSubjectsByClass(selectedClassId);
      renderSubjectsBlock();
      alert('Subject added!');
    } catch {
      alert('Failed to add subject.');
    }
  };
}
// --- Attendance ---
function renderAttendance() {
  const attendanceClassSel = document.getElementById('attendance-class');
  attendanceClassSel.innerHTML = '';
  if (!teacher.classes) return;
  teacher.classes.forEach(cls => {
    let opt = document.createElement('option');
    opt.value = cls.id;
    opt.innerText = cls.name;
    attendanceClassSel.appendChild(opt);
  });
  attendanceClassSel.onchange = renderAttendanceStudents;
  renderAttendanceStudents();
}
function renderAttendanceStudents() {
  const classId = document.getElementById('attendance-class').value;
  const students = studentsByClass[classId] || [];
  let html = `<table>
      <thead><tr><th>Student</th><th>Present</th></tr></thead>
      <tbody>`;
  students.forEach(stu => {
    const record = (attendanceRecords.find(a => a.classId === classId && a.studentId === stu.id) || { present: false });
    html += `<tr>
      <td data-label="Student">${stu.name}</td>
      <td data-label="Present"><input type="checkbox" name="present_${stu.id}" ${record.present ? 'checked' : ''}></td>
    </tr>`;
  });
  html += `</tbody></table>`;
  document.getElementById('attendance-students').innerHTML = html;
}
document.getElementById('attendance-form').onsubmit = async function (e) {
  e.preventDefault();
  const classId = document.getElementById('attendance-class').value;
  const students = studentsByClass[classId] || [];
  students.forEach(stu => {
    const cb = document.querySelector(`[name="present_${stu.id}"]`);
    let record = attendanceRecords.find(a => a.classId === classId && a.studentId === stu.id);
    if (!record) {
      record = { classId, studentId: stu.id, present: cb.checked };
      attendanceRecords.push(record);
    } else {
      record.present = cb.checked;
    }
  });
  alert('Attendance saved!');
  // Optionally: POST attendance to backend here, e.g.:
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/attendance`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ classId, attendance: attendanceRecords.filter(a => a.classId === classId) })
    });
    if (!res.ok) throw new Error();
    alert('Attendance posted to server!');
  } catch {
    alert('Failed to save attendance to server.');
  }
};

// --- Gradebook ---
function renderGradebook() {
  const gradebookClassSel = document.getElementById('gradebook-class');
  gradebookClassSel.innerHTML = '';
  if (!teacher.classes) return;
  teacher.classes.forEach(cls => {
    let opt = document.createElement('option');
    opt.value = cls.id;
    opt.innerText = cls.name;
    gradebookClassSel.appendChild(opt);
  });
  gradebookClassSel.onchange = renderGradebookTable;
  renderGradebookTable();
}
function renderGradebookTable() {
  const classId = document.getElementById('gradebook-class').value;
  const students = studentsByClass[classId] || [];
  const subjects = subjectsByClass[classId] || [];
  let html = `<table>
      <thead><tr><th>Student</th>`;
  subjects.forEach(subj => html += `<th>${subj.name}</th>`);
  html += `</tr></thead><tbody>`;
  students.forEach(stu => {
    html += `<tr><td data-label="Student">${stu.name}</td>`;
    subjects.forEach(subj => {
      const gb = (gradebookData[classId] && gradebookData[classId][stu.id] && gradebookData[classId][stu.id][subj.id]) || '-';
      html += `<td data-label="${subj.name}">${gb}</td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  document.getElementById('gradebook-table').innerHTML = html;
}



function renderAssignments() {
  const assignmentClassSel = document.getElementById('assignment-class');
  assignmentClassSel.innerHTML = '';
  if (!teacher.classes) return;
  teacher.classes.forEach(cls => {
    let opt = document.createElement('option');
    opt.value = cls.id;
    opt.innerText = cls.name;
    assignmentClassSel.appendChild(opt);
  });
  renderAssignmentList();
}

function populateAssignmentSubjects() {
  const classId = document.getElementById('assignment-class').value;
  const subjectSelect = document.getElementById('assignment-subject');
  subjectSelect.innerHTML = '';
  const subjects = subjectsByClass[classId] || [];
  subjects.forEach(subj => {
    let opt = document.createElement('option');
    opt.value = subj.id;
    opt.innerText = subj.name;
    subjectSelect.appendChild(opt);
  });
}

async function openAssignmentModal() {
  document.getElementById('assignmentModalBg').style.display = 'flex';
  populateAssignmentSubjects();
  document.getElementById('assignment-class').onchange = populateAssignmentSubjects;

  // Fetch and populate CBTs
  cbts = await fetchTeacherCBTs();
  populateAssignmentCBTs();
}

function renderAssignmentList() {
  const div = document.getElementById('assignment-list');
  if (!assignments.length) {
    div.innerHTML = '<em>No assignments yet.</em>';
    return;
  }
  let html = '<table><thead><tr><th>Title</th><th>Class</th><th>Due</th><th>CBT</th><th>Description</th></tr></thead><tbody>';
  assignments.forEach(a => {
    const classId = a.class && a.class._id ? a.class._id : a.class;
    const cls = teacher.classes.find(c => c.id == classId);
    let cbtTitle = '';
    if (a.cbt) {
      // Try to find CBT title if available
      const found = cbts.find(cbt => cbt._id === a.cbt);
      cbtTitle = found ? found.title : a.cbt;
    }
    html += `<tr>
      <td data-label="Title">${a.title}</td>
      <td data-label="Class">${(a.class && a.class.name) || (cls && cls.name) || classId || 'Unknown'}</td>
      <td data-label="Due">${a.dueDate ? a.dueDate.slice(0,10) : (a.due || '')}</td>
      <td data-label="CBT">${cbtTitle || '-'}</td>
      <td data-label="Description">${a.description || a.desc}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  div.innerHTML = html;
}

function closeAssignmentModal() {
  document.getElementById('assignmentModalBg').style.display = 'none';
}
// Submission handler for creating assignments
document.getElementById('assignmentForm').onsubmit = async function (e) {
  e.preventDefault();
  const classId = document.getElementById('assignment-class').value;
  const fd = new FormData(this);
  const assignment = {
    class: classId,
    subject: document.getElementById('assignment-subject').value,
    title: fd.get('title'),
    description: fd.get('desc'),
    dueDate: fd.get('due')
  };
  const cbtId = document.getElementById('assignment-cbt').value;
  if (cbtId) assignment.cbt = cbtId; // <-- Add CBT id if selected

  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacher.id)}/assignments`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(assignment)
    });
    if (!res.ok) throw new Error();
    assignments = await fetchAssignments();
    alert('Assignment created!');
    closeAssignmentModal();
    renderAssignmentList();
  } catch {
    alert('Failed to create assignment.');
  }
};
window.openAssignmentModal = openAssignmentModal;
window.closeAssignmentModal = closeAssignmentModal;

// --- Result Modal ---
let currentResultStudentId = null;
let currentResultClassId = null;
function openResultModal(studentId, classId) {
  currentResultStudentId = studentId;
  currentResultClassId = classId;
  let result = draftResults.find(r => r.studentId === studentId && r.classId === classId) || {};
  const subjects = subjectsByClass[classId] || [];
  let html = '<h4 style="margin:10px 0 7px 0;">Subjects & Scores</h4>';
  subjects.forEach(subj => {
    const data = (result.data && result.data[subj.id]) || {};
    html += `
      <label>${subj.name} - CA</label>
      <input type="number" min="0" max="20" name="ca_${subj.id}" value="${data.ca || ''}" required>
      <label>${subj.name} - Mid Term</label>
      <input type="number" min="0" max="20" name="mid_${subj.id}" value="${data.mid || ''}" required>
      <label>${subj.name} - Exam</label>
      <input type="number" min="0" max="60" name="exam_${subj.id}" value="${data.exam || ''}" required>
      <label>${subj.name} - Teacher's Comment</label>
      <input type="text" name="comment_${subj.id}" value="${data.comment || ''}">
    `;
  });
  html += `<h4 style="margin-top:15px;">Affective Skills (1-5)</h4>`;
  const affectiveSkills = ['Punctuality', 'Attentiveness', 'Neatness', 'Honesty', 'Politeness', 'Perseverance', 'Relationship with Others', 'Organization Ability'];
  affectiveSkills.forEach(skill => {
    html += `<label>${skill}</label>
      <input type="number" min="1" max="5" name="affective_${skill.toLowerCase().replace(/ /g, '_')}" value="${(result.affectiveRatings && result.affectiveRatings[skill]) || ''}">`;
  });
  html += `<h4 style="margin-top:15px;">Psychomotor Skills (1-5)</h4>`;
  const psychomotorSkills = ['Hand Writing', 'Drawing and Painting', 'Speech / Verbal Fluency', 'Quantitative Reasoning', 'Processing Speed', 'Retentiveness', 'Visual Memory', 'Public Speaking', 'Sports and Games'];
  psychomotorSkills.forEach(skill => {
    html += `<label>${skill}</label>
      <input type="number" min="1" max="5" name="psychomotor_${skill.toLowerCase().replace(/ |\//g, '_')}" value="${(result.psychomotorRatings && result.psychomotorRatings[skill]) || ''}">`;
  });
  html += `<h4 style="margin-top:15px;">Attendance</h4>
    <label>No. of School Days</label>
    <input type="number" min="0" name="attendance_total" value="${result.attendanceTotal || ''}">
    <label>No. of Days Present</label>
    <input type="number" min="0" name="attendance_present" value="${result.attendancePresent || ''}">
    <label>No. of Days Absent</label>
    <input type="number" min="0" name="attendance_absent" value="${result.attendanceAbsent || ''}">
    <label>% Attendance</label>
    <input type="number" min="0" max="100" step="0.01" name="attendance_percent" value="${result.attendancePercent || ''}">
  `;
  document.getElementById('resultFormFields').innerHTML = html;
  document.getElementById('resultModalBg').style.display = 'flex';
}
function closeResultModal() {
  document.getElementById('resultModalBg').style.display = 'none';
  currentResultStudentId = currentResultClassId = null;
}
document.getElementById('resultForm').onsubmit = async function (e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const subjects = subjectsByClass[currentResultClassId] || [];
  // --- Build subjects array for backend ---
  let subjectsPayload = [];
  subjects.forEach(subj => {
    subjectsPayload.push({
      subject: subj.id,
      ca: Number(fd.get(`ca_${subj.id}`)),
      mid: Number(fd.get(`mid_${subj.id}`)),
      exam: Number(fd.get(`exam_${subj.id}`)),
      comment: fd.get(`comment_${subj.id}`) || ''
    });
  });

  // --- Skills ---
  let affectiveRatings = {};
  ['Punctuality', 'Attentiveness', 'Neatness', 'Honesty', 'Politeness', 'Perseverance', 'Relationship with Others', 'Organization Ability']
    .forEach(skill => affectiveRatings[skill] = Number(fd.get(`affective_${skill.toLowerCase().replace(/ /g, '_')}`)));
  let psychomotorRatings = {};
  ['Hand Writing', 'Drawing and Painting', 'Speech / Verbal Fluency', 'Quantitative Reasoning', 'Processing Speed', 'Retentiveness', 'Visual Memory', 'Public Speaking', 'Sports and Games']
    .forEach(skill => psychomotorRatings[skill] = Number(fd.get(`psychomotor_${skill.toLowerCase().replace(/ |\//g, '_')}`)));

  // --- Attendance ---
  let attendanceTotal = Number(fd.get('attendance_total'));
  let attendancePresent = Number(fd.get('attendance_present'));
  let attendanceAbsent = Number(fd.get('attendance_absent'));
  let attendancePercent = Number(fd.get('attendance_percent'));

  // --- Term/session values: get from your UI (dropdown/select), or hardcode for now
  const term = "FIRST TERM"; // Or get from a select/dropdown
  const session = "2024–2025"; // Or get from a select/dropdown

  // --- Compose payload for backend ---
  const payload = {
    student: currentResultStudentId,
    class: currentResultClassId,
    term,
    session,
    subjects: subjectsPayload,
    affectiveRatings,
    psychomotorRatings,
    attendanceTotal,
    attendancePresent,
    attendanceAbsent,
    attendancePercent,
    status: "Draft" // Or "Published"
  };

  // --- POST to new backend endpoint ---
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacher.id)}/results`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save results");
    alert('Results saved!');
    closeResultModal();
    teacherResults = await fetchTeacherAllResults();
    renderTeacherResults(); // You may want to fetch published results instead!
  } catch (err) {
    alert('Failed to save results: ' + err.message);
  }
};
async function fetchTeacherAllResults() {
  try {
    // Fetch drafts and published in parallel
    const [draftRes, publishedRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacher.id)}/results?status=Draft`, { headers: authHeaders() }),
      fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacher.id)}/results?status=Published`, { headers: authHeaders() })
    ]);
    let draftResults = [];
    let publishedResults = [];
    if (draftRes.ok) {
      const drData = await draftRes.json();
      draftResults = Array.isArray(drData.results) ? drData.results : [];
    }
    if (publishedRes.ok) {
      const prData = await publishedRes.json();
      publishedResults = Array.isArray(prData.results) ? prData.results : [];
    }
    // Combine both arrays (optionally sort by updatedAt descending)
    return [...draftResults, ...publishedResults].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  } catch {
    return [];
  }
}
function renderTeacherResults() {
  const tbody = document.querySelector('#draft-results-table tbody');
  tbody.innerHTML = '';
  teacherResults.forEach(dr => {
    const stu = dr.student || {};
    const cls = dr.class || {};
    let statusColor = dr.status === "Published" ? "var(--accent)" : "var(--warning)";
    let tr = document.createElement('tr');
    tr.innerHTML = `<td data-label="Student">${stu.name || stu.firstname || '[Unknown]'}</td>
      <td data-label="Class">${cls.name || '[Unknown]'}</td>
      <td data-label="Term">${dr.term || ''}</td>
      <td data-label="Status" style="color:${statusColor};font-weight:bold">${dr.status || ''}</td>
      <td data-label="Last Updated">${dr.updatedAt ? new Date(dr.updatedAt).toLocaleString() : ''}</td>
      <td data-label="Actions">
        <button class="btn" onclick="openResultModal('${stu._id}','${cls._id}')">Edit</button>
        <button class="btn danger" onclick="alert('You cannot publish. Contact Admin.')">Publish</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
            }
// --- Notifications ---
function renderNotifications() {
  const list = document.getElementById('notification-list');
  list.innerHTML = `<h2>Notifications</h2>`;
  notifications.forEach(note => {
    const div = document.createElement('div');
    div.className = 'notification';
    div.innerHTML = `<span class="date">${note.date}</span> <span>${note.message}</span>`;
    list.appendChild(div);
  });
}

// --- Profile Update (Now connected to backend!) ---
document.getElementById('profile-form').onsubmit = async function (e) {
  e.preventDefault();
  const nameParts = document.getElementById('profile-name').value.split(' ');
  const payload = {
    first_name: nameParts[0] || '',
    last_name: nameParts.slice(1).join(' ') || '',
    email: document.getElementById('profile-email').value,
  };
  const password = document.getElementById('profile-password').value;
  if (password) payload.login_password = password;
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/me`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error();
    alert('Profile updated!');
  } catch {
    alert('Failed to update profile.');
  }
};
// --- CBT Question Upload Section ---
let cbtQuestions = [];

function renderCBTQuestionSection() {
  // Populate classes and subjects dropdowns
  const classSel = document.getElementById('cbt-class-select');
  const subjSel = document.getElementById('cbt-subject-select');
  classSel.innerHTML = '';
  subjSel.innerHTML = '';
  if (!teacher.classes) return;
  teacher.classes.forEach(cls => {
    let opt = document.createElement('option');
    opt.value = cls.id;
    opt.innerText = cls.name;
    classSel.appendChild(opt);
  });
  classSel.onchange = function() {
    const subjects = subjectsByClass[classSel.value] || [];
    subjSel.innerHTML = '';
    subjects.forEach(subj => {
      let opt = document.createElement('option');
      opt.value = subj.id;
      opt.innerText = subj.name;
      subjSel.appendChild(opt);
    });
  };
  // Trigger once
  classSel.onchange();

  // Setup question adder
  cbtQuestions = [];
  renderCBTQuestions();
}

function renderCBTQuestions() {
  const listDiv = document.getElementById('cbt-questions-list');
  listDiv.innerHTML = '';
  cbtQuestions.forEach((q, idx) => {
    let qDiv = document.createElement('div');
    qDiv.className = 'cbt-question-block';
    qDiv.innerHTML = `
      <label>Question ${idx+1}</label>
      <textarea class="cbt-question-text" placeholder="Question text">${q.text||''}</textarea>
      <label>Score</label>
      <input type="number" min="1" class="cbt-question-score" value="${q.score||1}">
      <label>Options</label>
      <div class="cbt-options-list"></div>
      <button type="button" class="btn danger" onclick="removeCBTQuestion(${idx})">Remove Question</button>
      <hr>
    `;
    listDiv.appendChild(qDiv);
    // Render options
    const optionsDiv = qDiv.querySelector('.cbt-options-list');
    optionsDiv.innerHTML = '';
    (q.options||[]).forEach((opt, oi) => {
      let optDiv = document.createElement('div');
      optDiv.innerHTML = `
        <input type="text" class="cbt-option-text" value="${opt}" placeholder="Option ${String.fromCharCode(65+oi)}">
        <input type="radio" name="correct_${idx}" ${q.answer===oi?'checked':''} onclick="setCBTCorrect(${idx},${oi})"> Correct
        <button type="button" class="btn danger" onclick="removeCBTOption(${idx},${oi})">Remove</button>
      `;
      optionsDiv.appendChild(optDiv);
    });
    let addOptBtn = document.createElement('button');
    addOptBtn.type = 'button';
    addOptBtn.className = 'btn';
    addOptBtn.textContent = '+ Add Option';
    addOptBtn.onclick = () => { addCBTOption(idx); };
    optionsDiv.appendChild(addOptBtn);

    // Handlers for text/score
    qDiv.querySelector('.cbt-question-text').oninput = (e) => { cbtQuestions[idx].text = e.target.value; };
    qDiv.querySelector('.cbt-question-score').oninput = (e) => { cbtQuestions[idx].score = Number(e.target.value)||1; };
    // Handlers for option text
    optionsDiv.querySelectorAll('.cbt-option-text').forEach((inp, oi) => {
      inp.oninput = (e) => { cbtQuestions[idx].options[oi] = e.target.value; };
    });
  });
}

window.removeCBTQuestion = function(idx) {
  cbtQuestions.splice(idx,1);
  renderCBTQuestions();
};
window.addCBTOption = function(qidx) {
  if (!cbtQuestions[qidx].options) cbtQuestions[qidx].options = [];
  cbtQuestions[qidx].options.push('');
  renderCBTQuestions();
};
window.removeCBTOption = function(qidx, oidx) {
  cbtQuestions[qidx].options.splice(oidx,1);
  if (cbtQuestions[qidx].answer === oidx) cbtQuestions[qidx].answer = 0;
  renderCBTQuestions();
};
window.setCBTCorrect = function(qidx, oidx) {
  cbtQuestions[qidx].answer = oidx;
};

document.getElementById('cbt-add-question-btn').onclick = function() {
  cbtQuestions.push({ text: '', options: [], answer: 0, score: 1 });
  renderCBTQuestions();
};

document.getElementById('cbt-question-form').onsubmit = async function(e) {
  e.preventDefault();
  // Validate
  const classId = document.getElementById('cbt-class-select').value;
  const subjectId = document.getElementById('cbt-subject-select').value;
  const title = document.getElementById('cbt-title').value.trim();
  const duration = Number(document.getElementById('cbt-duration').value);
  if (!classId || !subjectId || !title || !duration) {
    document.getElementById('cbt-upload-msg').style.color = 'red';
    document.getElementById('cbt-upload-msg').textContent = 'Please fill all fields.';
    return;
  }
  if (!cbtQuestions.length) {
    document.getElementById('cbt-upload-msg').style.color = 'red';
    document.getElementById('cbt-upload-msg').textContent = 'Add at least one question.';
    return;
  }
  for (let [i, q] of cbtQuestions.entries()) {
    if (!q.text || !Array.isArray(q.options) || q.options.length < 2)
      return document.getElementById('cbt-upload-msg').textContent = `Question ${i+1} must have text and at least 2 options.`;
    for (let o of q.options) if (!o) return document.getElementById('cbt-upload-msg').textContent = `No empty options allowed.`;
    if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length)
      return document.getElementById('cbt-upload-msg').textContent = `Select a correct option for Question ${i+1}.`;
  }
  // Submit to backend (adjust endpoint as needed)
  const payload = {
    title,
    class: classId,
    subject: subjectId,
    duration,
    questions: cbtQuestions.map(q => ({
      text: q.text,
      options: q.options,
      answer: q.answer,
      score: q.score
    }))
  };
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacher.id)}/cbt`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text());
    document.getElementById('cbt-upload-msg').style.color = 'green';
    document.getElementById('cbt-upload-msg').textContent = 'CBT uploaded successfully!';
    cbtQuestions = [];
    renderCBTQuestions();
  } catch (err) {
    document.getElementById('cbt-upload-msg').style.color = 'red';
    document.getElementById('cbt-upload-msg').textContent = 'Upload failed: ' + err.message;
  }
};
// --- Initial Render (called after data is fetched) ---
window.renderClassesList = renderClassesList;
window.renderStudentsBlock = renderStudentsBlock;
window.renderSubjectsBlock = renderSubjectsBlock;
window.openAssignmentModal = openAssignmentModal;
window.closeAssignmentModal = closeAssignmentModal;
window.openResultModal = openResultModal;
window.closeResultModal = closeResultModal;
