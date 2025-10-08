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
let teacherResults = [];

// --- INITIAL FETCH & SETUP ---
window.addEventListener('DOMContentLoaded', fetchAndSetup);

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

  teacherResults = await fetchTeacherAllResults();

  renderClassesList();
  renderStudentsBlock();
  renderSubjectsBlock();
  showAddSubjectBlock();
}

function authHeaders() {
  return token ? { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token } : { 'Content-Type': 'application/json' };
}

// --- API: CRUD for each section ---
// Students
async function deleteStudent(studentId, classId) {
  if (!confirm("Are you sure you want to delete this student?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/student/${studentId}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    if (!res.ok) throw new Error();
    studentsByClass[classId] = await fetchStudentsByClass(classId);
    renderStudentsBlock();
    alert("Student deleted.");
  } catch {
    alert("Failed to delete student.");
  }
}
// Subjects
async function updateSubject(subjectId, classId, newName) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/classes/${classId}/subjects/${subjectId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ name: newName })
    });
    if (!res.ok) throw new Error();
    subjectsByClass[classId] = await fetchSubjectsByClass(classId);
    renderSubjectsBlock();
    alert("Subject updated!");
  } catch {
    alert("Failed to update subject.");
  }
}
async function deleteSubject(subjectId, classId) {
  if (!confirm("Are you sure you want to delete this subject?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/classes/${classId}/subjects/${subjectId}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    if (!res.ok) throw new Error();
    subjectsByClass[classId] = await fetchSubjectsByClass(classId);
    renderSubjectsBlock();
    alert("Subject deleted.");
  } catch {
    alert("Failed to delete subject.");
  }
}
// Assignments
async function updateAssignment(assignmentId, updatedData) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacher.id)}/assignments/${assignmentId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(updatedData)
    });
    if (!res.ok) throw new Error();
    assignments = await fetchAssignments();
    renderAssignmentList();
    alert("Assignment updated!");
  } catch {
    alert("Failed to update assignment.");
  }
}
async function deleteAssignment(assignmentId) {
  if (!confirm("Are you sure you want to delete this assignment?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacher.id)}/assignments/${assignmentId}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    if (!res.ok) throw new Error();
    assignments = await fetchAssignments();
    renderAssignmentList();
    alert("Assignment deleted.");
  } catch {
    alert("Failed to delete assignment.");
  }
}
// Results
async function deleteResult(resultId) {
  if (!confirm("Are you sure you want to delete this result?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacher.id)}/results/${resultId}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    if (!res.ok) throw new Error();
    teacherResults = await fetchTeacherAllResults();
    renderTeacherResults();
    alert("Result deleted.");
  } catch {
    alert("Failed to delete result.");
  }
}

// --- Backend API CALLS ---
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
async function fetchDraftResults() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacher.id)}/results?status=Draft`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch { return []; }
}
async function fetchTeacherAllResults() {
  try {
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
    return [...draftResults, ...publishedResults].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  } catch {
    return [];
  }
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
        <button class="btn warning" onclick="editStudent('${stu.id}','${selectedClassId}')">Update</button>
        <button class="btn danger" onclick="deleteStudent('${stu.id}','${selectedClassId}')">Delete</button>
      </td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  block.innerHTML = html;
}

// Edit student modal and update logic
function editStudent(studentId, classId) {
  const stu = (studentsByClass[classId] || []).find(s => s.id === studentId);
  if (!stu) return alert("Student not found.");
  const modal = document.getElementById('editStudentModal');
  document.getElementById('editStudentName').value = stu.name || '';
  document.getElementById('editStudentRegNo').value = stu.regNo || '';
  document.getElementById('editStudentEmail').value = stu.email || '';
  modal.style.display = 'flex';
  modal.dataset.studentId = studentId;
  modal.dataset.classId = classId;
}
document.getElementById('editStudentForm').onsubmit = async function(e) {
  e.preventDefault();
  const modal = document.getElementById('editStudentModal');
  const studentId = modal.dataset.studentId;
  const classId = modal.dataset.classId;
  const payload = {
    name: document.getElementById('editStudentName').value,
    regNo: document.getElementById('editStudentRegNo').value,
    email: document.getElementById('editStudentEmail').value
  };
  try {
    const res = await fetch(`${API_BASE_URL}/api/student/${studentId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error();
    studentsByClass[classId] = await fetchStudentsByClass(classId);
    renderStudentsBlock();
    alert("Student updated!");
    closeEditStudentModal();
  } catch {
    alert("Failed to update student.");
  }
};
function closeEditStudentModal() {
  document.getElementById('editStudentModal').style.display = 'none';
}

// --- Subjects Block ---
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
    html += `<li>
      ${subj.name || subj}
      <button class="btn warning" onclick="promptUpdateSubject('${subj.id}','${selectedClassId}','${subj.name || subj}')">Update</button>
      <button class="btn danger" onclick="deleteSubject('${subj.id}','${selectedClassId}')">Delete</button>
    </li>`;
  });
  html += '</ul></div>';
  block.innerHTML = html;
}
// Prompt update subject
function promptUpdateSubject(subjectId, classId, currentName) {
  const newName = prompt("Update subject name:", currentName);
  if (newName && newName !== currentName) updateSubject(subjectId, classId, newName);
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

function openAssignmentModal(editId = null) {
  document.getElementById('assignmentModalBg').style.display = 'flex';
  populateAssignmentSubjects();
  document.getElementById('assignment-class').onchange = populateAssignmentSubjects;
  if (editId) {
    // Populate form with assignment data
    const assign = assignments.find(a => a._id === editId || a.id === editId);
    if (assign) {
      document.getElementById('assignment-class').value = assign.class && assign.class._id ? assign.class._id : assign.class;
      document.getElementById('assignment-subject').value = assign.subject;
      document.getElementById('assignment-title').value = assign.title;
      document.getElementById('assignment-desc').value = assign.description || assign.desc;
      document.getElementById('assignment-due').value = assign.dueDate ? assign.dueDate.slice(0,10) : (assign.due || '');
      document.getElementById('assignmentForm').dataset.editId = editId;
    }
  } else {
    document.getElementById('assignmentForm').reset();
    document.getElementById('assignmentForm').dataset.editId = '';
  }
}

function renderAssignmentList() {
  const div = document.getElementById('assignment-list');
  if (!assignments.length) {
    div.innerHTML = '<em>No assignments yet.</em>';
    return;
  }
  let html = '<table><thead><tr><th>Title</th><th>Class</th><th>Due</th><th>Description</th><th>Actions</th></tr></thead><tbody>';
  assignments.forEach(a => {
    const classId = a.class && a.class._id ? a.class._id : a.class;
    const cls = teacher.classes.find(c => c.id == classId);
    html += `<tr>
      <td data-label="Title">${a.title}</td>
      <td data-label="Class">${(a.class && a.class.name) || (cls && cls.name) || classId || 'Unknown'}</td>
      <td data-label="Due">${a.dueDate ? a.dueDate.slice(0,10) : (a.due || '')}</td>
      <td data-label="Description">${a.description || a.desc}</td>
      <td>
        <button class="btn warning" onclick="openAssignmentModal('${a._id || a.id}')">Update</button>
        <button class="btn danger" onclick="deleteAssignment('${a._id || a.id}')">Delete</button>
      </td>
    </tr>`;
  });
  html += '</tbody></table>';
  div.innerHTML = html;
}

function closeAssignmentModal() {
  document.getElementById('assignmentModalBg').style.display = 'none';
  document.getElementById('assignmentForm').dataset.editId = '';
}

document.getElementById('assignmentForm').onsubmit = async function (e) {
  e.preventDefault();
  const editId = e.target.dataset.editId;
  const classId = document.getElementById('assignment-class').value;
  const assignment = {
    class: classId,
    subject: document.getElementById('assignment-subject').value,
    title: document.getElementById('assignment-title').value,
    description: document.getElementById('assignment-desc').value,
    dueDate: document.getElementById('assignment-due').value
  };
  try {
    if (editId) {
      await updateAssignment(editId, assignment);
      alert('Assignment updated!');
    } else {
      const res = await fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacher.id)}/assignments`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(assignment)
      });
      if (!res.ok) throw new Error();
      assignments = await fetchAssignments();
      alert('Assignment created!');
    }
    closeAssignmentModal();
    renderAssignmentList();
  } catch {
    alert('Failed to create/update assignment.');
  }
};
window.openAssignmentModal = openAssignmentModal;
window.closeAssignmentModal = closeAssignmentModal;

// --- Result Modal ---
let currentResultStudentId = null;
let currentResultClassId = null;
let currentEditResultId = null;
function openResultModal(studentId, classId, resultId=null) {
  currentResultStudentId = studentId;
  currentResultClassId = classId;
  currentEditResultId = resultId;
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
  currentResultStudentId = currentResultClassId = currentEditResultId = null;
}
document.getElementById('resultForm').onsubmit = async function (e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const subjects = subjectsByClass[currentResultClassId] || [];
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

  const term = "FIRST TERM";
  const session = "2024–2025";

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
    status: "Draft"
  };

  try {
    let res, data;
    if (currentEditResultId) {
      res = await fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacher.id)}/results/${currentEditResultId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacher.id)}/results`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
    }
    data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save results");
    alert(currentEditResultId ? 'Results updated!' : 'Results saved!');
    closeResultModal();
    teacherResults = await fetchTeacherAllResults();
    renderTeacherResults();
  } catch (err) {
    alert('Failed to save results: ' + err.message);
  }
};

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
        <button class="btn warning" onclick="openResultModal('${stu._id}','${cls._id}','${dr._id || dr.id}')">Update</button>
        <button class="btn danger" onclick="deleteResult('${dr._id || dr.id}')">Delete</button>
        <button class="btn" onclick="alert('You cannot publish. Contact Admin.')">Publish</button>
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
    div.innerHTML = `<span class="date">${note.date}</span> <span>${note.message}</span>
      <button class="btn danger" onclick="deleteNotification('${note._id || note.id}')">Delete</button>`;
    list.appendChild(div);
  });
}
// Delete notification
async function deleteNotification(notificationId) {
  if (!confirm("Delete this notification?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/teachers/${encodeURIComponent(teacher.id)}/notifications/${notificationId}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    if (!res.ok) throw new Error();
    notifications = await fetchTeacherNotifications();
    renderNotifications();
    alert("Notification deleted.");
  } catch {
    alert("Failed to delete notification.");
  }
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
window.renderSubjectsBlock = renderSubjectsBlock;
window.openAssignmentModal = openAssignmentModal;
window.closeAssignmentModal = closeAssignmentModal;
window.openResultModal = openResultModal;
window.closeResultModal = closeResultModal;
window.promptUpdateSubject = promptUpdateSubject;
window.deleteSubject = deleteSubject;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.deleteAssignment = deleteAssignment;
window.deleteResult = deleteResult;
window.deleteNotification = deleteNotification;

// --- Student Edit Modal HTML (inject in teachers.html) ---
// <div id="editStudentModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:2000;background:rgba(32,40,71,0.23);align-items:center;justify-content:center;">
//   <form id="editStudentForm" style="background:#fff;padding:30px;border-radius:10px;max-width:320px;">
//     <h3>Edit Student</h3>
//     <label>Name</label><input type="text" id="editStudentName"><br>
//     <label>Reg. No.</label><input type="text" id="editStudentRegNo"><br>
//     <label>Email</label><input type="email" id="editStudentEmail"><br>
//     <div style="margin-top:12px;">
//       <button type="submit" class="btn warning">Update</button>
//       <button type="button" class="btn" onclick="closeEditStudentModal()">Cancel</button>
//     </div>
//   </form>
// </div>
