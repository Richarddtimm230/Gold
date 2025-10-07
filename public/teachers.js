
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

// --- INITIAL FETCH & SETUP ---
window.addEventListener('DOMContentLoaded', fetchAndSetup);

async function fetchAndSetup() {
  teacher = await fetchTeacherProfile();
  if (!teacher) return alert("Failed to load teacher profile.");
  document.querySelector('.profile-section strong').textContent = teacher.name;
  document.querySelector('.profile-section small').textContent = teacher.role || '';
  document.querySelector('header h1').textContent = `Welcome, ${teacher.name}`;
  document.querySelector('.avatar').textContent = (teacher.name || '').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  teacher.classes = await fetchTeacherClasses(teacher.id);

  notifications = await fetchTeacherNotifications(teacher.id);

  studentsByClass = {};
  subjectsByClass = {};
  for (const cls of teacher.classes) {
    studentsByClass[cls.id] = await fetchStudentsByClass(cls.name);
    subjectsByClass[cls.id] = await fetchSubjectsByClass(cls.name);
  }

  assignments = await fetchAssignments(teacher.id) || [];
  draftResults = await fetchDraftResults(teacher.id) || [];

  renderClassesList();
  renderStudentsBlock();
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

async function fetchTeacherClasses(teacherId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/classes?teacher_id=${encodeURIComponent(teacherId)}`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.classes) ? data.classes : [];
  } catch { return []; }
}

async function fetchTeacherNotifications(teacherId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacherId)}/notifications`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.notifications) ? data.notifications : [];
  } catch { return []; }
}

async function fetchStudentsByClass(className) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/students?class=${encodeURIComponent(className)}`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.students) ? data.students.map(stu => ({
      ...stu,
      id: stu.student_id || stu.regNo,
      name: stu.name || `${stu.firstname} ${stu.surname}`,
    })) : [];
  } catch { return []; }
}

async function fetchSubjectsByClass(className) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/subjects?class=${encodeURIComponent(className)}`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.subjects) ? data.subjects : [];
  } catch { return []; }
}

async function fetchAssignments(teacherId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacherId)}/assignments`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.assignments) ? data.assignments : [];
  } catch { return []; }
}

async function fetchDraftResults(teacherId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacherId)}/draft-results`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.draftResults) ? data.draftResults : [];
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
  profile: document.getElementById('section-profile')
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
  if (!teacher.classes) return;
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
    };
    li.appendChild(btn);
    classList.appendChild(li);
  });
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
  /*
  try {
    const res = await fetch(`${API_BASE_URL}/api/attendance`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ classId, attendance: attendanceRecords.filter(a => a.classId === classId) })
    });
    if (!res.ok) throw new Error();
    alert('Attendance posted to server!');
  } catch {
    alert('Failed to save attendance to server.');
  }
  */
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

// --- Assignments ---
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
function renderAssignmentList() {
  const div = document.getElementById('assignment-list');
  if (!assignments.length) {
    div.innerHTML = '<em>No assignments yet.</em>';
    return;
  }
  let html = '<table><thead><tr><th>Title</th><th>Class</th><th>Due</th><th>Description</th></tr></thead><tbody>';
  assignments.forEach(a => {
    const cls = teacher.classes.find(c => c.id === a.class) || {};
    html += `<tr>
      <td data-label="Title">${a.title}</td>
      <td data-label="Class">${cls.name || a.class}</td>
      <td data-label="Due">${a.dueDate ? a.dueDate.slice(0,10) : (a.due || '')}</td>
      <td data-label="Description">${a.description || a.desc}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  div.innerHTML = html;
}
function openAssignmentModal() {
  document.getElementById('assignmentModalBg').style.display = 'flex';
}
function closeAssignmentModal() {
  document.getElementById('assignmentModalBg').style.display = 'none';
}
document.getElementById('assignmentForm').onsubmit = async function (e) {
  e.preventDefault();
  const classId = document.getElementById('assignment-class').value;
  const fd = new FormData(this);
  const assignment = {
  class: classId,
  subject: document.getElementById('assignment-subject').value, // <-- NEW
  title: fd.get('title'),
  description: fd.get('desc'),
  dueDate: fd.get('due')
};
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacher.id)}/assignments`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(assignment)
    });
    if (!res.ok) throw new Error();
    const { assignment: created } = await res.json();
    assignments.push(created);
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
  let resultData = {};
  subjects.forEach(subj => {
    resultData[subj.id] = {
      ca: Number(fd.get(`ca_${subj.id}`)),
      mid: Number(fd.get(`mid_${subj.id}`)),
      exam: Number(fd.get(`exam_${subj.id}`)),
      comment: fd.get(`comment_${subj.id}`) || ''
    };
  });
  let affectiveRatings = {};
  ['Punctuality', 'Attentiveness', 'Neatness', 'Honesty', 'Politeness', 'Perseverance', 'Relationship with Others', 'Organization Ability']
    .forEach(skill => affectiveRatings[skill] = Number(fd.get(`affective_${skill.toLowerCase().replace(/ /g, '_')}`)));
  let psychomotorRatings = {};
  ['Hand Writing', 'Drawing and Painting', 'Speech / Verbal Fluency', 'Quantitative Reasoning', 'Processing Speed', 'Retentiveness', 'Visual Memory', 'Public Speaking', 'Sports and Games']
    .forEach(skill => psychomotorRatings[skill] = Number(fd.get(`psychomotor_${skill.toLowerCase().replace(/ |\//g, '_')}`)));
  let attendanceTotal = Number(fd.get('attendance_total'));
  let attendancePresent = Number(fd.get('attendance_present'));
  let attendanceAbsent = Number(fd.get('attendance_absent'));
  let attendancePercent = Number(fd.get('attendance_percent'));
  let draft = draftResults.find(r => r.studentId === currentResultStudentId && r.classId === currentResultClassId);
  if (!draft) {
    draft = {
      studentId: currentResultStudentId,
      classId: currentResultClassId,
      term: 'First Term',
      status: 'Draft',
      updated: (new Date()).toISOString().slice(0, 16).replace('T', ' '),
      data: {}
    };
    draftResults.push(draft);
  }
  draft.data = resultData;
  draft.affectiveRatings = affectiveRatings;
  draft.psychomotorRatings = psychomotorRatings;
  draft.attendanceTotal = attendanceTotal;
  draft.attendancePresent = attendancePresent;
  draft.attendanceAbsent = attendanceAbsent;
  draft.attendancePercent = attendancePercent;
  draft.updated = (new Date()).toISOString().slice(0, 16).replace('T', ' ');

  // POST to backend
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacher.id)}/draft-results`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(draft)
    });
    if (!res.ok) throw new Error();
    alert('Draft result saved!');
    closeResultModal();
    renderDraftResults();
  } catch {
    alert('Failed to save draft result.');
  }
};
window.openResultModal = openResultModal;
window.closeResultModal = closeResultModal;

// --- Draft Results ---
function renderDraftResults() {
  const tbody = document.querySelector('#draft-results-table tbody');
  tbody.innerHTML = '';
  draftResults.forEach(dr => {
    const stu = Object.values(studentsByClass).flat().find(s => s.id === dr.studentId) || {};
    const cls = teacher.classes.find(c => c.id === dr.classId) || {};
    let tr = document.createElement('tr');
    tr.innerHTML = `<td data-label="Student">${stu.name || '[Unknown]'}</td>
      <td data-label="Class">${cls.name || dr.classId}</td>
      <td data-label="Term">${dr.term}</td>
      <td data-label="Status">${dr.status}</td>
      <td data-label="Last Updated">${dr.updated}</td>
      <td data-label="Actions">
        <button class="btn" onclick="openResultModal('${dr.studentId}','${dr.classId}')">Edit</button>
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

// --- Initial Render (called after data is fetched) ---
window.renderClassesList = renderClassesList;
window.renderStudentsBlock = renderStudentsBlock;
window.openAssignmentModal = openAssignmentModal;
window.closeAssignmentModal = closeAssignmentModal;
window.openResultModal = openResultModal;
window.closeResultModal = closeResultModal;
