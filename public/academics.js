// Sidebar toggle for mobile
const sidebar = document.getElementById('academicsSidebar');
const menuToggleBtn = document.getElementById('menuToggleBtn');
menuToggleBtn.onclick = function(){ sidebar.classList.toggle('show'); };
document.addEventListener('click', function(e){
  if(window.innerWidth <= 900 && sidebar.classList.contains('show')){
    if (!sidebar.contains(e.target) && e.target !== menuToggleBtn) sidebar.classList.remove('show');
  }
});
window.addEventListener('resize', function(){
  if(window.innerWidth > 900) sidebar.classList.remove('show');
});

// Tab logic
function showTab(tab) {
  document.querySelectorAll('.tablist button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  document.querySelectorAll('.section-card').forEach(sec => sec.classList.toggle('hidden', sec.dataset.section !== tab));
  // Sidebar nav as well (desktop)
  document.querySelectorAll('.sidebar nav a').forEach(nav => nav.classList.toggle('active', nav.dataset.tab === tab));
}
document.querySelectorAll('.tablist button').forEach(btn => {
  btn.onclick = () => showTab(btn.dataset.tab);
});
document.querySelectorAll('.sidebar nav a').forEach(nav => {
  nav.onclick = (e) => { e.preventDefault(); showTab(nav.dataset.tab); };
});

// Exam section tabs
function showExamTab(tab){
  document.querySelectorAll('#examTabs button').forEach(btn => btn.classList.toggle('active', btn.dataset.examtab === tab));
  document.querySelectorAll('#examTabContent > div').forEach(sec => sec.classList.toggle('hidden', sec.dataset.examsection !== tab));
}
document.querySelectorAll('#examTabs button').forEach(btn => {
  btn.onclick = () => showExamTab(btn.dataset.examtab);
});

// API base
const API_BASE = "https://goldlincschools.onrender.com/api/academics";
const token = localStorage.getItem('adminToken') || localStorage.getItem('token');

// Utility: Fill dropdowns
async function fillDropdown(endpoint, selectId, valueKey='name') {
  try {
    const res = await fetch(API_BASE + endpoint, { headers: { Authorization: "Bearer " + token }});
    const data = await res.json();
    document.getElementById(selectId).innerHTML = data.map(d => `<option value="${d._id}">${d[valueKey]}</option>`).join('');
  } catch{ }
}
// Fill teacher select for Classes tab
async function fillTeacherDropdown() {
  try {
    const res = await fetch("https://goldlincschools.onrender.com/api/teachers", { headers: { Authorization: "Bearer " + token }});
    const data = await res.json();
    document.getElementById('classTeacherSelect').innerHTML = data.map(t =>
      `<option value="${t.id}">${t.name} (${t.email})</option>`
    ).join('');
  } catch{}
}
fillTeacherDropdown();

async function fillClassDropdown() {
  const res = await fetch(API_BASE + "/classes", { headers: { Authorization: "Bearer " + token }});
  const data = await res.json();
  document.getElementById('assignClassSelect').innerHTML = data.map(c =>
    `<option value="${c._id}">${c.name}</option>`
  ).join('');
}
async function fillTeacherDropdown2() {
  const res = await fetch(API_BASE.replace('/academics','') + "/teachers", { headers: { Authorization: "Bearer " + token }});
  const data = await res.json();
  document.getElementById('assignSubjectTeacherSelect').innerHTML = data.map(t =>
    `<option value="${t.id}">${t.name} (${t.email})</option>`
  ).join('');
}
fillClassDropdown();
fillTeacherDropdown2();



// ============ CLASSES ============

// Fill teacher checkboxes for Classes tab
function toggleTeacherDropdown() {
  document.getElementById('teacherDropdownMenu').classList.toggle('hidden');
  // Optionally, close on click outside
  document.addEventListener('click', function handler(e) {
    if (!document.getElementById('teacherDropdownMenu').contains(e.target) &&
        e.target.id !== "teacherDropdownBtn") {
      document.getElementById('teacherDropdownMenu').classList.add('hidden');
      document.removeEventListener('click', handler);
    }
  });
}

async function fillTeacherCheckboxes() {
  try {
    const res = await fetch("https://goldlincschools.onrender.com/api/teachers", { headers: { Authorization: "Bearer " + token }});
    const data = await res.json();
    const container = document.getElementById('teacherDropdownMenu');
    container.innerHTML = data.map(t =>
      `<label class="flex items-center px-3 py-2 hover:bg-[#f1f6fb]">
        <input type="checkbox" name="teacherIds" value="${t.id}" class="mr-2"> ${t.name} (${t.email})
      </label>`
    ).join('');
  } catch{}
}
fillTeacherCheckboxes();

// ============ CLASSES ============

async function loadClasses() {
  const tbody = document.getElementById('classesTableBody');
  try {
    const res = await fetch(API_BASE + "/classes", { headers: { Authorization: "Bearer " + token }});
    const classes = await res.json();
    if (!classes.length) { tbody.innerHTML = '<tr><td class="py-2 px-3" colspan="4">No classes found.</td></tr>'; return;}
    tbody.innerHTML = classes.map(c =>
  `<tr>
    <td class="py-2 px-3">${c.name}</td>
    <td class="py-2 px-3">${c.arms && c.arms.length ? c.arms.join(', ') : '-'}</td>
    <td class="py-2 px-3">${
      c.teachers && c.teachers.length ? c.teachers.map(t => `${t.first_name ?? t.name ?? ''} ${t.last_name ?? ''}`).join(', ') : '-'
    }</td>
    <td class="py-2 px-3">
      <button class="px-2 py-1 rounded bg-[#2647a6] text-white text-xs" onclick="editClass('${c._id}')"><i class="fa fa-edit"></i></button>
      <button class="px-2 py-1 rounded bg-red-600 text-white text-xs" onclick="deleteClass('${c._id}', this)"><i class="fa fa-trash"></i></button>
    </td>
  </tr>`
).join('');
  } catch { tbody.innerHTML = '<tr><td class="py-2 px-3" colspan="4">Error loading classes.</td></tr>'; }
}
loadClasses();
window.deleteClass = async function(id, btn) {
  // No confirmation, delete immediately
  btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
  try {
    const res = await fetch(`${API_BASE}/classes/${id}`, { method: "DELETE", headers: { Authorization: "Bearer " + token } });
    if (res.ok) loadClasses();
    else alert("Failed to delete.");
  } finally { btn.disabled = false; btn.innerHTML = '<i class="fa fa-trash"></i>'; }
};


// Add Class
document.getElementById('classForm').onsubmit = async function(e){
  e.preventDefault();
  const form = this;
  const data = Object.fromEntries(new FormData(form));
  data.arms = data.arms ? data.arms.split(',').map(a => a.trim()).filter(a => a) : [];
  // Get checked teachers
  const teacherCheckboxes = form.querySelectorAll('input[name="teacherIds"]:checked');
  data.teacherIds = Array.from(teacherCheckboxes).map(cb => cb.value);
  const editId = form.getAttribute('data-edit-id');
  document.getElementById('classMessage').textContent = "Saving...";
  try{
    const method = editId ? "PUT" : "POST";
    const url = API_BASE + "/classes" + (editId ? "/" + editId : "");
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(data)
    });
    document.getElementById('classMessage').textContent = res.ok ? "Saved!" : "Failed!";
    form.removeAttribute('data-edit-id');
    form.reset();
    loadClasses();
    // Uncheck all teacher checkboxes after reset
    Array.from(document.querySelectorAll('#classTeacherCheckboxes input[type="checkbox"]')).forEach(cb => cb.checked = false);
  }catch{ document.getElementById('classMessage').textContent = "Network error."; }
};

function editClass(id) {
  fetch(`${API_BASE}/classes/${id}`, { headers: { Authorization: "Bearer " + token }})
    .then(res => res.json())
    .then(cls => {
      const form = document.getElementById('classForm');
      form.name.value = cls.name || "";
      form.arms.value = cls.arms && cls.arms.length ? cls.arms.join(', ') : "";
      // Preselect teachers (checkboxes)
      const teacherCheckboxes = form.querySelectorAll('input[name="teacherIds"]');
      teacherCheckboxes.forEach(cb => {
        cb.checked = cls.teachers?.some(t => t._id === cb.value || t.id === cb.value);
      });
      form.setAttribute('data-edit-id', id);
      document.getElementById('classMessage').textContent = "Editing class. Save to update.";
    });
}
// Assign Subject to Class & Teacher
document.getElementById('assignSubjectForm').onsubmit = async function(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  document.getElementById('assignSubjectMessage').textContent = "Saving...";
  try {
    const res = await fetch(API_BASE + `/classes/${data.classId}/subjects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ subjectName: data.subjectName, teacherId: data.teacherId })
    });
    const resp = await res.json();
    document.getElementById('assignSubjectMessage').textContent = res.ok ? "Assigned!" : ("Error: " + (resp.error || "Unknown"));
    if (res.ok) form.reset();
  } catch (err) {
    document.getElementById('assignSubjectMessage').textContent = "Network error.";
  }
};
// Update sessions table render to include delete button
async function loadSessions() {
  await fillDropdown("/sessions", "termSessionSelect");
  await fillDropdown("/sessions", "resultsSessionSelect");
  const tbody = document.getElementById('sessionsTableBody');
  try {
    const res = await fetch(API_BASE + "/sessions", { headers: { Authorization: "Bearer " + token }});
    const sessions = await res.json();
    if (!sessions.length) { tbody.innerHTML = '<tr><td class="py-2 px-3" colspan="4">No sessions found.</td></tr>'; return;}
    tbody.innerHTML = sessions.map(s =>
      `<tr>
        <td class="py-2 px-3">${s.name}</td>
        <td class="py-2 px-3">${s.startDate ? s.startDate.slice(0,10) : ''}</td>
        <td class="py-2 px-3">${s.endDate ? s.endDate.slice(0,10) : ''}</td>
        <td class="py-2 px-3">
          <button class="px-2 py-1 rounded bg-[#2647a6] text-white text-xs" onclick="editSession('${s._id}')"><i class="fa fa-edit"></i></button>
          <button class="px-2 py-1 rounded bg-red-600 text-white text-xs" onclick="deleteSession('${s._id}', this)"><i class="fa fa-trash"></i></button>
        </td>
      </tr>`).join('');
  } catch { tbody.innerHTML = '<tr><td class="py-2 px-3" colspan="4">Error loading sessions.</td></tr>'; }
}
  loadSessions();
window.deleteSession = async function(id, btn) {
  // No confirmation, delete immediately
  btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
  try {
    const res = await fetch(`${API_BASE}/sessions/${id}`, { method: "DELETE", headers: { Authorization: "Bearer " + token } });
    if (res.ok) loadSessions();
    else alert("Failed to delete.");
  } finally { btn.disabled = false; btn.innerHTML = '<i class="fa fa-trash"></i>'; }
};



// Edit Session
function editSession(id) {
  fetch(`${API_BASE}/sessions/${id}`, { headers: { Authorization: "Bearer " + token }})
    .then(res => res.json())
    .then(session => {
      const form = document.getElementById('sessionForm');
      form.name.value = session.name || "";
      form.startDate.value = session.startDate ? session.startDate.slice(0,10) : "";
      form.endDate.value = session.endDate ? session.endDate.slice(0,10) : "";
      form.setAttribute('data-edit-id', id);
      document.getElementById('sessionMessage').textContent = "Editing session. Save to update.";
    });
}
// Save Session (add/edit)
document.getElementById('sessionForm').onsubmit = async function(e){
  e.preventDefault();
  const form = this;
  const data = Object.fromEntries(new FormData(form));
  const editId = form.getAttribute('data-edit-id');
  document.getElementById('sessionMessage').textContent = "Saving...";
  try{
    const method = editId ? "PUT" : "POST";
    const url = API_BASE + "/sessions" + (editId ? "/" + editId : "");
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(data)
    });
    document.getElementById('sessionMessage').textContent = res.ok ? "Saved!" : "Failed!";
    form.removeAttribute('data-edit-id');
    form.reset();
    loadSessions();
  }catch{ document.getElementById('sessionMessage').textContent = "Network error."; }
};

// Terms Table


async function loadTerms() {
  const tbody = document.getElementById('termsTableBody');
  try {
    const res = await fetch(API_BASE + "/terms", { headers: { Authorization: "Bearer " + token }});
    const terms = await res.json();
    if (!terms.length) { tbody.innerHTML = '<tr><td class="py-2 px-3" colspan="5">No terms found.</td></tr>'; return;}
    tbody.innerHTML = terms.map(t =>
      `<tr>
        <td class="py-2 px-3">${t.name}</td>
        <td class="py-2 px-3">${t.session?.name || '-'}</td>
        <td class="py-2 px-3">${t.startDate ? t.startDate.slice(0,10) : ''}</td>
        <td class="py-2 px-3">${t.endDate ? t.endDate.slice(0,10) : ''}</td>
        <td class="py-2 px-3">
          <button class="px-2 py-1 rounded bg-[#2647a6] text-white text-xs" onclick="editTerm('${t._id}')"><i class="fa fa-edit"></i></button>
          <button class="px-2 py-1 rounded bg-red-600 text-white text-xs" onclick="deleteTerm('${t._id}', this)"><i class="fa fa-trash"></i></button>
        </td>
      </tr>`).join('');
  } catch { tbody.innerHTML = '<tr><td class="py-2 px-3" colspan="5">Error loading terms.</td></tr>'; }
}
loadTerms();
window.deleteTerm = async function(id, btn) {
  // No confirmation, delete immediately
  btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
  try {
    const res = await fetch(`${API_BASE}/terms/${id}`, { method: "DELETE", headers: { Authorization: "Bearer " + token } });
    if (res.ok) loadTerms();
    else alert("Failed to delete.");
  } finally { btn.disabled = false; btn.innerHTML = '<i class="fa fa-trash"></i>'; }
};


// Edit Term
function editTerm(id) {
  fetch(`${API_BASE}/terms/${id}`, { headers: { Authorization: "Bearer " + token }})
    .then(res => res.json())
    .then(term => {
      const form = document.getElementById('termForm');
      form.name.value = term.name || "";
      form.sessionId.value = term.sessionId || "";
      form.startDate.value = term.startDate ? term.startDate.slice(0,10) : "";
      form.endDate.value = term.endDate ? term.endDate.slice(0,10) : "";
      form.setAttribute('data-edit-id', id);
      document.getElementById('termMessage').textContent = "Editing term. Save to update.";
    });
}
// Save Term (add/edit)
document.getElementById('termForm').onsubmit = async function(e){
  e.preventDefault();
  const form = this;
  const data = Object.fromEntries(new FormData(form));
  const editId = form.getAttribute('data-edit-id');
  document.getElementById('termMessage').textContent = "Saving...";
  try{
    const method = editId ? "PUT" : "POST";
    const url = API_BASE + "/terms" + (editId ? "/" + editId : "");
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(data)
    });
    document.getElementById('termMessage').textContent = res.ok ? "Saved!" : "Failed!";
    form.removeAttribute('data-edit-id');
    form.reset();
    loadTerms();
  }catch{ document.getElementById('termMessage').textContent = "Network error."; }
};

// Exams: fill dropdowns
fillDropdown("/terms", "examTermSelect");
fillDropdown("/classes", "examClassSelect");
fillDropdown("/classes", "cbtClassSelect");
fillDropdown("/classes", "resultsClassSelect");

// Exams Schedule Table


// ============ EXAMS SCHEDULE ============

async function loadExamSchedules() {
  const tbody = document.getElementById('examScheduleTableBody');
  try {
    const res = await fetch(API_BASE + "/exams/schedules", { headers: { Authorization: "Bearer " + token }});
    const exams = await res.json();
    if (!exams.length) { tbody.innerHTML = '<tr><td class="py-2 px-3" colspan="5">No exams scheduled.</td></tr>'; return;}
    tbody.innerHTML = exams.map(ex =>
      `<tr>
        <td class="py-2 px-3">${ex.title}</td>
        <td class="py-2 px-3">${ex.term?.name || '-'}</td>
        <td class="py-2 px-3">${ex.class?.name || '-'}</td>
        <td class="py-2 px-3">${ex.date ? ex.date.slice(0,10) : ''}</td>
        <td class="py-2 px-3">
          <button class="px-2 py-1 rounded bg-[#2647a6] text-white text-xs" onclick="editExamSchedule('${ex._id}')"><i class="fa fa-edit"></i></button>
          <button class="px-2 py-1 rounded bg-red-600 text-white text-xs" onclick="deleteExamSchedule('${ex._id}', this)"><i class="fa fa-trash"></i></button>
        </td>
      </tr>`).join('');
  } catch { tbody.innerHTML = '<tr><td class="py-2 px-3" colspan="5">Error loading schedules.</td></tr>'; }
}
loadExamSchedules();
window.deleteExamSchedule = async function(id, btn) {
  // No confirmation, delete immediately
  btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
  try {
    const res = await fetch(`${API_BASE}/exams/schedules/${id}`, { method: "DELETE", headers: { Authorization: "Bearer " + token } });
    if (res.ok) loadExamSchedules();
    else alert("Failed to delete.");
  } finally { btn.disabled = false; btn.innerHTML = '<i class="fa fa-trash"></i>'; }
};


// Edit Exam Schedule
function editExamSchedule(id) {
  fetch(`${API_BASE}/exams/schedules/${id}`, { headers: { Authorization: "Bearer " + token }})
    .then(res => res.json())
    .then(exam => {
      const form = document.getElementById('examScheduleForm');
      form.title.value = exam.title || "";
      form.termId.value = exam.termId || "";
      form.classId.value = exam.classId || "";
      form.date.value = exam.date ? exam.date.slice(0,10) : "";
      form.setAttribute('data-edit-id', id);
      document.getElementById('examScheduleMessage').textContent = "Editing exam schedule. Save to update.";
    });
}
// Save Exam Schedule (add/edit)
document.getElementById('examScheduleForm').onsubmit = async function(e){
  e.preventDefault();
  const form = this;
  const data = Object.fromEntries(new FormData(form));
  const editId = form.getAttribute('data-edit-id');
  document.getElementById('examScheduleMessage').textContent = "Saving...";
  try{
    const method = editId ? "PUT" : "POST";
    const url = API_BASE + "/exams/schedules" + (editId ? "/" + editId : "");
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(data)
    });
    document.getElementById('examScheduleMessage').textContent = res.ok ? "Saved!" : "Failed!";
    form.removeAttribute('data-edit-id');
    form.reset();
    loadExamSchedules();
  }catch{ document.getElementById('examScheduleMessage').textContent = "Network error."; }
};

// Mode: fill exams dropdown
async function fillExamDropdown() {
  try {
    const res = await fetch(API_BASE + "/exams/schedules", { headers: { Authorization: "Bearer " + token }});
    const exams = await res.json();
    document.getElementById('modeExamSelect').innerHTML = exams.map(ex => `<option value="${ex._id}">${ex.title}</option>`).join('');
  } catch {}
}
fillExamDropdown();

// Exam Mode Table
async function loadExamModes() {
  const tbody = document.getElementById('examModeTableBody');
  try {
    const res = await fetch(API_BASE + "/exams/modes", { headers: { Authorization: "Bearer " + token }});
    const modes = await res.json();
    if (!modes.length) { tbody.innerHTML = '<tr><td class="py-2 px-3" colspan="4">No exam modes set.</td></tr>'; return;}
    tbody.innerHTML = modes.map(m =>
      `<tr>
        <td class="py-2 px-3">${m.exam?.title || '-'}</td>
        <td class="py-2 px-3">${m.mode}</td>
        <td class="py-2 px-3">${m.duration || '-'}</td>
        <td class="py-2 px-3"><button class="px-2 py-1 rounded bg-[#2647a6] text-white text-xs" onclick="editExamMode('${m._id}')"><i class="fa fa-edit"></i></button></td>
      </tr>`).join('');
  } catch { tbody.innerHTML = '<tr><td class="py-2 px-3" colspan="4">Error loading modes.</td></tr>'; }
}
loadExamModes();

// Edit Exam Mode
function editExamMode(id) {
  fetch(`${API_BASE}/exams/modes/${id}`, { headers: { Authorization: "Bearer " + token }})
    .then(res => res.json())
    .then(mode => {
      const form = document.getElementById('examModeForm');
      form.examId.value = mode.examId || "";
      form.mode.value = mode.mode || "";
      form.duration.value = mode.duration || "";
      form.setAttribute('data-edit-id', id);
      document.getElementById('examModeMessage').textContent = "Editing exam mode. Save to update.";
    });
}
// Save Exam Mode (add/edit)
document.getElementById('examModeForm').onsubmit = async function(e){
  e.preventDefault();
  const form = this;
  const data = Object.fromEntries(new FormData(form));
  const editId = form.getAttribute('data-edit-id');
  document.getElementById('examModeMessage').textContent = "Saving...";
  try{
    const method = editId ? "PUT" : "POST";
    const url = API_BASE + "/exams/modes" + (editId ? "/" + editId : "");
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(data)
    });
    document.getElementById('examModeMessage').textContent = res.ok ? "Saved!" : "Failed!";
    form.removeAttribute('data-edit-id');
    form.reset();
    loadExamModes();
  }catch{ document.getElementById('examModeMessage').textContent = "Network error."; }
};



// ============ CBT & MOCKS ============

async function loadCBTs() {
  const tbody = document.getElementById('cbtTableBody');
  try {
    const res = await fetch(API_BASE + "/cbt/mocks", { headers: { Authorization: "Bearer " + token }});
    const cbts = await res.json();
    if (!cbts.length) { tbody.innerHTML = '<tr><td class="py-2 px-3" colspan="5">No CBT/mocks found.</td></tr>'; return;}
    tbody.innerHTML = cbts.map(c =>
      `<tr>
        <td class="py-2 px-3">${c.title}</td>
        <td class="py-2 px-3">${c.class?.name || '-'}</td>
        <td class="py-2 px-3">${c.mode}</td>
        <td class="py-2 px-3">${c.date ? c.date.slice(0,10) : ''}</td>
        <td class="py-2 px-3">
          <button class="px-2 py-1 rounded bg-[#2647a6] text-white text-xs" onclick="editCBT('${c._id}')"><i class="fa fa-edit"></i></button>
          <button class="px-2 py-1 rounded bg-red-600 text-white text-xs" onclick="deleteCBT('${c._id}', this)"><i class="fa fa-trash"></i></button>
        </td>
      </tr>`).join('');
  } catch { tbody.innerHTML = '<tr><td class="py-2 px-3" colspan="5">Error loading CBT/mocks.</td></tr>'; }
}
loadCBTs();
window.deleteCBT = async function(id, btn) {
  // No confirmation, delete immediately
  btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
  try {
    const res = await fetch(`${API_BASE}/cbt/mocks/${id}`, { method: "DELETE", headers: { Authorization: "Bearer " + token } });
    if (res.ok) loadCBTs();
    else alert("Failed to delete.");
  } finally { btn.disabled = false; btn.innerHTML = '<i class="fa fa-trash"></i>'; }
};


// Edit CBT/Mock
function editCBT(id) {
  fetch(`${API_BASE}/cbt/mocks/${id}`, { headers: { Authorization: "Bearer " + token }})
    .then(res => res.json())
    .then(cbt => {
      const form = document.getElementById('cbtForm');
      form.title.value = cbt.title || "";
      form.classId.value = cbt.classId || "";
      form.mode.value = cbt.mode || "";
      form.date.value = cbt.date ? cbt.date.slice(0,10) : "";
      form.setAttribute('data-edit-id', id);
      document.getElementById('cbtMessage').textContent = "Editing CBT/mock. Save to update.";
    });
}
// Save CBT/Mock (add/edit)
document.getElementById('cbtForm').onsubmit = async function(e){
  e.preventDefault();
  const form = this;
  const data = Object.fromEntries(new FormData(form));
  const editId = form.getAttribute('data-edit-id');
  document.getElementById('cbtMessage').textContent = "Saving...";
  try{
    const method = editId ? "PUT" : "POST";
    const url = API_BASE + "/cbt/mocks" + (editId ? "/" + editId : "");
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify(data)
    });
    document.getElementById('cbtMessage').textContent = res.ok ? "Saved!" : "Failed!";
    form.removeAttribute('data-edit-id');
    form.reset();
    loadCBTs();
  }catch{ document.getElementById('cbtMessage').textContent = "Network error."; }
};
async function fillPushCBTSessionDropdown() {
  try {
    const res = await fetch("https://goldlincschools.onrender.com/api/academics/sessions", { headers: { Authorization: "Bearer " + token } });
    const data = await res.json();
    document.getElementById('pushCBTSessionSelect').innerHTML = data.map(s => `<option value="${s._id}">${s.name}</option>`).join('');
  } catch {}
}
async function fillPushCBTTermDropdown() {
  try {
    const res = await fetch("https://goldlincschools.onrender.com/api/academics/terms", { headers: { Authorization: "Bearer " + token } });
    const data = await res.json();
    document.getElementById('pushCBTTermSelect').innerHTML = data.map(t => `<option value="${t._id}">${t.name} (${t.session?.name || "-"})</option>`).join('');
  } catch {}
}

async function loadResults(filter = {}) {
  const tbody = document.getElementById('resultsTableBody');
  tbody.innerHTML = '<tr><td class="py-2 px-3" colspan="7">Loading...</td></tr>';
  try {
    let results = [];
    // If "CBT" is selected, use the dedicated CBT results API
    if (filter.type === "CBT") {
      let url = "https://goldlincschools.onrender.com/api/result";
      const res = await fetch(url, { headers: { Authorization: "Bearer " + token } });
      results = await res.json();
      if (!results.length) {
        tbody.innerHTML = '<tr><td class="py-2 px-3" colspan="7">No CBT results found.</td></tr>';
        return;
      }
      tbody.innerHTML = results.map(r =>
        `<tr>
          <td class="py-2 px-3">${r.studentName || '-'}</td>
          <td class="py-2 px-3">${r.className || '-'}</td>
          <td class="py-2 px-3">CBT</td>
          <td class="py-2 px-3">${r.examTitle || '-'}</td>
          <td class="py-2 px-3">${r.score}/${r.total}</td>
          <td class="py-2 px-3">${r.finishedAt ? r.finishedAt.slice(0, 10) : ''}</td>
          <td class="py-2 px-3">
            <button class="px-2 py-1 rounded bg-red-600 text-white text-xs" onclick="deleteCBTResult('${r._id}', this)">
              <i class="fa fa-trash"></i>
            </button>
          </td>
        </tr>`
      ).join('');
      return;
    }
    // Otherwise, use default endpoint for mocks or other types
    let url = API_BASE + "/results/cbt-mocks";
    if (filter.sessionId || filter.classId || filter.type) {
      url += '?' + new URLSearchParams(filter).toString();
    }
    const res = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    results = await res.json();
    if (!results.length) {
      tbody.innerHTML = '<tr><td class="py-2 px-3" colspan="7">No results found.</td></tr>';
      return;
    }
    tbody.innerHTML = results.map(r =>
      `<tr>
        <td class="py-2 px-3">${r.student?.name || '-'}</td>
        <td class="py-2 px-3">${r.class?.name || '-'}</td>
        <td class="py-2 px-3">${r.type || '-'}</td>
        <td class="py-2 px-3">${r.exam?.title || r.mock?.title || '-'}</td>
        <td class="py-2 px-3">${r.score}</td>
        <td class="py-2 px-3">${r.date ? r.date.slice(0, 10) : ''}</td>
        <td class="py-2 px-3">
          <button class="px-2 py-1 rounded bg-red-600 text-white text-xs" onclick="deleteCBTResult('${r._id}', this)">
            <i class="fa fa-trash"></i>
          </button>
        </td>
      </tr>`
    ).join('');
  } catch {
    tbody.innerHTML = '<tr><td class="py-2 px-3" colspan="7">Error loading results.</td></tr>';
  }
}

document.getElementById('resultsFilterForm').onsubmit = function (e) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(this));
  loadResults(data);
};

const pushCBTResultsBtn = document.getElementById('pushCBTResultsBtn');
const pushCBTModal = document.getElementById('pushCBTModal');
const pushCBTModalForm = document.getElementById('pushCBTModalForm');
const pushCBTResultsMessage = document.getElementById('pushCBTResultsMessage');
const pushCBTModalFeedback = document.getElementById('pushCBTModalFeedback');
const cancelPushCBTModal = document.getElementById('cancelPushCBTModal');

pushCBTResultsBtn.onclick = () => {
  fillPushCBTSessionDropdown();
  fillPushCBTTermDropdown();
  pushCBTModal.classList.remove('hidden');
  pushCBTModalFeedback.textContent = "";
};
// Close modal on cancel
cancelPushCBTModal.onclick = () => {
  pushCBTModal.classList.add('hidden');
  pushCBTModalFeedback.textContent = "";
};

pushCBTModalForm.onsubmit = async function(e) {
  e.preventDefault();
  const formData = new FormData(pushCBTModalForm);
  const scoreField = formData.get('scoreField');
  const sessionId = formData.get('sessionId');
  const termId = formData.get('termId');
  pushCBTModalFeedback.textContent = "Pushing CBT results...";
  try {
    const res = await fetch("https://goldlincschools.onrender.com/api/results/push-cbt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ scoreField, sessionId, termId })
    });
    const data = await res.json();
    if (data.success) {
      pushCBTModalFeedback.textContent = `Done! Inserted: ${data.inserted}, Skipped: ${data.skipped}`;
      pushCBTResultsMessage.textContent = `Last push: Inserted ${data.inserted}, Skipped ${data.skipped}`;
    } else {
      pushCBTModalFeedback.textContent = "Error: " + (data.error || "Unknown error");
    }
  } catch (err) {
    pushCBTModalFeedback.textContent = "Network error";
  } finally {
    setTimeout(() => {
      pushCBTModal.classList.add('hidden');
    }, 2000);
  }
};
window.deleteCBTResult = async function(id, btn) {
  // No confirmation, delete immediately
  btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
  try {
    // For CBT results - adjust the endpoint if your API differs
    let url;
    if (window.location.href.includes("/academics.html")) {
      // Try both endpoints if needed
      url = `https://goldlincschools.onrender.com/api/result/${id}`;
      let res = await fetch(url, { method: "DELETE", headers: { Authorization: "Bearer " + token } });
      if (!res.ok) {
        // Try alternate endpoint if needed
        url = API_BASE + `/results/cbt-mocks/${id}`;
        res = await fetch(url, { method: "DELETE", headers: { Authorization: "Bearer " + token } });
      }
      if (res.ok) {
        loadResults(); // reload table
      } else {
        alert("Failed to delete.");
      }
    }
  } catch {
    alert("Network error.");
  } finally {
    btn.disabled = false; btn.innerHTML = '<i class="fa fa-trash"></i>';
  }
};
// --- Render Uploaded Subjects ---
async function loadUploadedSubjects() {
  const tbody = document.getElementById('uploadedSubjectsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td class="py-2 px-3" colspan="5">Loading...</td></tr>';
  try {
    // Adjust endpoint if needed for your API
    const res = await fetch("https://goldlincschools.onrender.com/api/academics/classes", { headers: { Authorization: "Bearer " + token } });
    const classes = await res.json();
    let rows = [];
    classes.forEach(cls => {
      if (Array.isArray(cls.subjects)) {
        cls.subjects.forEach(subj => {
          // Use subj.subject as the subject's ObjectId reference if available, otherwise subj._id
          const subjectId = subj.subject || subj._id;
          rows.push(`
            <tr>
      <td class="py-2 px-3">${subj.subject?.name || '-'}</td>
      <td class="py-2 px-3">${cls.name || '-'}</td>
      <td class="py-2 px-3">${subj.teacher ? (subj.teacher.name || `${subj.teacher.first_name || ''} ${subj.teacher.last_name || ''}`) : '-'}</td>
      <td class="py-2 px-3">${subj.uploadedAt ? new Date(subj.uploadedAt).toLocaleDateString() : '-'}</td>
      <td class="py-2 px-3">
                <button class="px-2 py-1 rounded bg-[#2647a6] text-white text-xs" title="View" onclick="viewSubject('${subjectId}')"><i class="fa fa-eye"></i></button>
                <button class="px-2 py-1 rounded bg-red-600 text-white text-xs" title="Delete" onclick="deleteSubjectFromClass('${cls._id}', '${subj.subject?._id || subj.subject}', this)"><i class="fa fa-trash"></i></button>
              </td>
            </tr>
          `);
        });
      }
    });
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td class="py-2 px-3" colspan="5">No subjects uploaded.</td></tr>';
    } else {
      tbody.innerHTML = rows.join('');
    }
  } catch {
    tbody.innerHTML = '<tr><td class="py-2 px-3" colspan="5">Error loading uploaded subjects.</td></tr>';
  }
}

// Optional: Subject view handler
window.viewSubject = function(id) {
  alert("Subject details for " + id);
  // Implement modal or details view if needed
};

// Updated: Subject delete handler for class subjects
window.deleteSubjectFromClass = async function(classId, subjectId, btn) {
  // No confirmation, delete immediately
  btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
  try {
    const res = await fetch(`https://goldlincschools.onrender.com/api/academics/classes/${classId}/subjects/${subjectId}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token }
    });
    if (res.ok) loadUploadedSubjects();
    else {
      const data = await res.json();
      alert("Failed to delete: " + (data.error || "Unknown error"));
    }
  } catch {
    alert("Network error.");
  } finally {
    btn.disabled = false; btn.innerHTML = '<i class="fa fa-trash"></i>';
  }
};

// Show tab logic (add loadUploadedSubjects when showing "subjects" tab)
function showTab(tab) {
  document.querySelectorAll('.tablist button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  document.querySelectorAll('.section-card').forEach(sec => sec.classList.toggle('hidden', sec.dataset.section !== tab));
  document.querySelectorAll('.sidebar nav a').forEach(nav => nav.classList.toggle('active', nav.dataset.tab === tab));
  // Load uploaded subjects when entering the subjects tab
  if (tab === "subjects") loadUploadedSubjects();
}
window.editSession = editSession;
window.editTerm = editTerm;
window.editExamSchedule = editExamSchedule;
window.editExamMode = editExamMode;
window.editCBT = editCBT;
window.editClass = editClass;
