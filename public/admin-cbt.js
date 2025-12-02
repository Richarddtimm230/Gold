
  // Sidebar open/close for mobile
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  document.getElementById('openSidebarBtn').onclick = () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.remove('hidden');
  };
  sidebarOverlay.onclick = () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.add('hidden');
  };

  // Navigation
  const navLinks = [
    { id: 'nav-exams', cb: showExams },
    { id: 'nav-upload', cb: showUploadExam },
    { id: 'nav-schedule', cb: showScheduleExam },
    { id: 'nav-results', cb: showResults },
    { id: 'nav-activity', cb: showStudentActivity },
    { id: 'nav-logout', cb: logout }
  ];
  navLinks.forEach(({ id, cb }) => {
    document.getElementById(id).onclick = function() {
      setActiveNav(id);
      if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.add('hidden');
      }
      cb();
    };
  });
  function setActiveNav(id) {
    navLinks.forEach(({ id: navId }) => {
      document.getElementById(navId).classList.toggle('active', navId === id);
    });
  }

  // --- DYNAMIC CONTENT LOADERS ---

  // 1. Exams List (View, Edit, Delete, Stop)
  function showExams() {
    document.getElementById('contentArea').innerHTML = `
      <div class="flex items-center justify-between mb-7">
        <h2 class="text-2xl font-bold text-[#22305a]">All Exams</h2>
        <button class="cbt-btn" onclick="showUploadExam()"><i class="fa fa-plus mr-1"></i> Upload Exam</button>
      </div>
      <div id="examsTable" class="overflow-auto"></div>
    `;
    loadExamsTable();
  }
  async function loadExamsTable() {
    // Assumed GET /api/exams
    const exams = await fetch('https://goldlincschools.onrender.com/api/exam').then(r => r.json()).catch(() => []);
    const table = document.getElementById('examsTable');
    if (!Array.isArray(exams) || exams.length === 0) {
      table.innerHTML = `<div class="text-center text-gray-500 mt-12">No exams found.</div>`; return;
    }
    let html = `<table class="min-w-full border text-left">
      <thead class="bg-[#f6f8fa] text-[#2647a6]">
        <tr>
          <th class="p-3">Title</th>
          <th class="p-3">Class</th>
          <th class="p-3">Subject</th>
          <th class="p-3">Scheduled</th>
          <th class="p-3">Status</th>
          <th class="p-3">Actions</th>
        </tr>
      </thead>
      <tbody>`;
    for (const ex of exams) {
      html += `<tr class="border-b hover:bg-[#e9f0fe]">
        <td class="p-3 font-semibold">${ex.title}</td>
        <td class="p-3">${ex.className || ''}</td>
        <td class="p-3">${ex.subjectName || ''}</td>
        <td class="p-3">${ex.scheduledFor ? new Date(ex.scheduledFor).toLocaleString() : '-'}</td>
        <td class="p-3">${ex.status || 'Draft'}</td>
        <td class="p-3 flex gap-1 flex-wrap">
          <button title="View" class="text-blue-700" onclick="viewExam('${ex._id}')"><i class="fa fa-eye"></i></button>
          <button title="Edit" class="text-green-600" onclick="editExam('${ex._id}')"><i class="fa fa-edit"></i></button>
          <button title="Delete" class="text-red-600" onclick="deleteExam('${ex._id}')"><i class="fa fa-trash"></i></button>
          <button title="Stop" class="text-yellow-600" onclick="stopExam('${ex._id}')"><i class="fa fa-stop"></i></button>
        </td>
      </tr>`;
    }
    html += `</tbody></table>`;
    table.innerHTML = html;
  }
  window.showUploadExam = showUploadExam;
  window.showScheduleExam = showScheduleExam;

  // 2. Upload Exam (NEW, with Quill)
  async function showUploadExam() {
    // Fetch class/subject lists
    const classes = await fetch('https://goldlincschools.onrender.com/api/classes').then(r => r.json()).catch(() => []);
    const subjects = await fetch('https://goldlincschools.onrender.com/api/subjects').then(r => r.json()).catch(() => []);
    document.getElementById('contentArea').innerHTML = `
      <h2 class="text-2xl font-bold mb-5 text-[#22305a]">Upload New Exam</h2>
      <form id="uploadExamForm" class="space-y-6 max-w-2xl">
        <div>
          <label>Title <span class="text-red-500">*</span></label>
          <input name="title" required class="block w-full rounded border px-3 py-2 mt-1"/>
        </div>
        <div>
          <label>Class <span class="text-red-500">*</span></label>
          <select name="class" required class="block w-full rounded border px-3 py-2 mt-1">
            <option value="">Select Class</option>
            ${classes.map(c => `<option value="${c._id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>Subject <span class="text-red-500">*</span></label>
          <select name="subject" required class="block w-full rounded border px-3 py-2 mt-1">
            <option value="">Select Subject</option>
            ${subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>Duration (minutes) <span class="text-red-500">*</span></label>
          <input name="duration" type="number" min="1" required class="block w-full rounded border px-3 py-2 mt-1"/>
        </div>
        <div>
          <label>Questions <span class="text-red-500">*</span></label>
          <div id="questionsList"></div>
          <button type="button" class="cbt-btn mt-2" id="addQuestionBtn"><i class="fa fa-plus mr-1"></i> Add Question</button>
        </div>
        <button type="submit" class="cbt-btn mt-2"><i class="fa fa-upload mr-1"></i> Upload Exam</button>
      </form>
      <div id="uploadExamMsg" class="mt-4"></div>
    `;

    // Make questions array global so it persists
    if (!window.questions) window.questions = [];
    // Ensure questions is reset on each upload form show
    window.questions = [];

    function getQuillConfig() {
      return {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline'],
            [{ list: 'ordered'}, { list: 'bullet' }],
            ['image', 'code-block'],
            ['clean']
          ]
        }
      }
    }

    // Quill Image Upload (Cloudinary)
    Quill.prototype.getModule('toolbar').addHandler('image', function() {
      selectLocalImage(this.quill);
    });
    async function selectLocalImage(quill) {
      const input = document.createElement('input');
      input.setAttribute('type', 'file');
      input.setAttribute('accept', 'image/*');
      input.click();
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
        const res = await fetch('https://goldlincschools.onrender.com/api/upload/image', { method: 'POST', body: formData });
        const data = await res.json();
        if(data.url){
          const range = quill.getSelection();
          quill.insertEmbed(range ? range.index : 0, 'image', data.url);
        } else {
          alert('Image upload failed.');
        }
      };
    }
    // Observe for new editors and patch image upload
    function patchAllQuills() {
      document.querySelectorAll('.quill-editor').forEach(ed => {
        if (ed.__quill) {
          ed.__quill.getModule('toolbar').addHandler('image', function() {
            selectLocalImage(ed.__quill)
          });
        }
      });
    }
    const observer = new MutationObserver(() => { patchAllQuills(); });
    observer.observe(document.body, { childList: true, subtree: true });

    function renderQuestions() {
      const qlist = document.getElementById('questionsList');
      if (!qlist) return;
      qlist.innerHTML = '';
      window.questions.forEach((q, qi) => {
        qlist.innerHTML += `
        <div class="border rounded-xl bg-[#f9fafd] p-4 mb-5" data-question-idx="${qi}">
          <div class="flex items-center justify-between mb-2">
            <div class="font-semibold text-lg text-[#2647a6]">Question ${qi + 1}</div>
            <button type="button" class="text-red-600 remove-question-btn"><i class="fa fa-trash"></i></button>
          </div>
          <label>Question Text:</label>
          <div id="qtext-quill-${qi}" class="quill-editor mb-2"></div>
          <label>Score: </label>
          <input type="number" min="1" value="${q.score || 1}" class="score-input block w-24 mb-3 border rounded px-2 py-1" placeholder="Score" />
          <label>Options:</label>
          <div id="optionsList-${qi}" class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 mb-2"></div>
          <button type="button" class="cbt-btn add-option-btn" data-qidx="${qi}"><i class="fa fa-plus mr-1"></i> Add Option</button>
          <div class="mt-2">
            <label>Correct Option: </label>
            <select class="correct-answer-select border rounded px-2 py-1 ml-2">
              ${(q.options||[]).map((o, oi) => `<option value="${oi}" ${q.answer === oi ? 'selected' : ''}>Option ${String.fromCharCode(65+oi)}</option>`).join('')}
            </select>
          </div>
        </div>
        `;
      });
      // Setup Quill and dynamic handlers for questions and options
      window.questions.forEach((q, qi) => {
        let container = document.getElementById(`qtext-quill-${qi}`);
        if(container) {
          let quill = new Quill(container, getQuillConfig());
          if(q.text) quill.root.innerHTML = q.text;
          quill.on('text-change', () => { window.questions[qi].text = quill.root.innerHTML; });
          container.__quill = quill;
        }
        renderOptions(qi);
      });
      // Remove question buttons
      document.querySelectorAll('.remove-question-btn').forEach((btn, idx) => {
        btn.onclick = function() {
          window.questions.splice(idx, 1);
          renderQuestions();
        };
      });
      // Add option buttons
      document.querySelectorAll('.add-option-btn').forEach(btn => {
        btn.onclick = function() {
          const qidx = Number(btn.getAttribute('data-qidx'));
          if (!window.questions[qidx].options) window.questions[qidx].options = [];
          window.questions[qidx].options.push({ value: '' });
          renderQuestions();
        }
      });
      // Correct answer and score input
      window.questions.forEach((q, qi) => {
        const corrSel = document.querySelector(`[data-question-idx="${qi}"] .correct-answer-select`);
        if (corrSel) {
          corrSel.onchange = function() { window.questions[qi].answer = Number(this.value); };
        }
        const scoreInput = document.querySelector(`[data-question-idx="${qi}"] .score-input`);
        if (scoreInput) {
          scoreInput.onchange = function() { window.questions[qi].score = Number(this.value) || 1; };
        }
      });
    }

    function renderOptions(qi) {
      const olist = document.getElementById(`optionsList-${qi}`);
      if (!olist) return;
      olist.innerHTML = '';
      (window.questions[qi].options||[]).forEach((opt, oi) => {
        olist.innerHTML += `
          <div class="border rounded p-2 mb-1 bg-white flex flex-col gap-1 relative" data-option-idx="${oi}">
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold">Option ${String.fromCharCode(65+oi)}</span>
              <button type="button" class="text-red-600 remove-option-btn" data-qidx="${qi}" data-oidx="${oi}"><i class="fa fa-trash"></i></button>
            </div>
            <div id="q${qi}-opt-quill-${oi}" class="quill-editor"></div>
          </div>
        `;
      });
      (window.questions[qi].options||[]).forEach((opt, oi) => {
        let container = document.getElementById(`q${qi}-opt-quill-${oi}`);
        if(container) {
          let quill = new Quill(container, getQuillConfig());
          if(opt.value) quill.root.innerHTML = opt.value;
          quill.on('text-change', () => { window.questions[qi].options[oi].value = quill.root.innerHTML; });
          container.__quill = quill;
        }
      });
      // Remove option buttons
      olist.querySelectorAll('.remove-option-btn').forEach((btn) => {
        btn.onclick = function() {
          const qidx = Number(btn.getAttribute('data-qidx'));
          const oidx = Number(btn.getAttribute('data-oidx'));
          window.questions[qidx].options.splice(oidx, 1);
          renderQuestions();
        }
      });
    }

    document.addEventListener('click', function(e) {
  if (e.target && e.target.id === 'addQuestionBtn') {
    window.questions.push({ text: '', options: [], answer: 0, score: 1 });
    renderQuestions();
  }
});

    // Initial render
    renderQuestions();
    attachUploadFormHandler();
  }

  function attachUploadFormHandler() {
    const uploadForm = document.getElementById('uploadExamForm');
    if (!uploadForm) return;
    uploadForm.onsubmit = null; // Remove previous
    uploadForm.onsubmit = async function(e) {
      e.preventDefault();
      const fd = new FormData(this);
      const title = fd.get('title');
      const classId = fd.get('class');
      const subjectId = fd.get('subject');
      const duration = Number(fd.get('duration'));
      if (!title || !classId || !subjectId || !duration) {
        document.getElementById('uploadExamMsg').innerHTML = `<div class="text-red-600">All exam fields are required.</div>`; return;
      }
      if (!window.questions || !window.questions.length) {
        document.getElementById('uploadExamMsg').innerHTML = `<div class="text-red-600">Add at least one question.</div>`; return;
      }
      for (let [i, q] of window.questions.entries()) {
        if (!q.text || !(q.options && q.options.length >= 2)) {
          document.getElementById('uploadExamMsg').innerHTML = `<div class="text-red-600">Question ${i + 1} must have text and at least 2 options.</div>`; return;
        }
        for (let [j, o] of (q.options || []).entries()) {
          if (!o.value) {
            document.getElementById('uploadExamMsg').innerHTML = `<div class="text-red-600">Question ${i + 1} Option ${String.fromCharCode(65 + j)} cannot be empty.</div>`; return;
          }
        }
        if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length) {
          document.getElementById('uploadExamMsg').innerHTML = `<div class="text-red-600">Select a valid correct option for Question ${i + 1}.</div>`; return;
        }
      }
      const payload = {
        title,
        class: classId,
        subject: subjectId,
        duration,
        questions: window.questions.map(q => ({
          text: q.text,
          options: q.options,
          answer: q.answer,
          score: q.score || 1
        }))
      };
      try {
        const res = await fetch('https://goldlincschools.onrender.com/api/exam', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.error) {
          document.getElementById('uploadExamMsg').innerHTML = `<div class="text-red-600">${data.error}</div>`;
        } else {
          document.getElementById('uploadExamMsg').innerHTML = `<div class="text-green-600">Exam uploaded successfully.</div>`;
          setTimeout(() => {
            if (typeof showExams === 'function') showExams();
          }, 1200);
        }
      } catch (err) {
        document.getElementById('uploadExamMsg').innerHTML = `<div class="text-red-600">Network or server error.</div>`;
      }
    };
  }

// Replace your showScheduleExam function with this complete version:
async function showScheduleExam() {
  // Fetch all exams
  document.getElementById('contentArea').innerHTML = `
    <h2 class="text-2xl font-bold mb-5 text-[#22305a]">Schedule & Merge Exams</h2>
    <div id="schedule-loader" class="flex items-center justify-center py-10"><i class="fa fa-spinner fa-spin fa-2x text-blue-400"></i> <span class="ml-3 text-blue-700 font-bold">Loading exams...</span></div>
  `;

  // Show loader while fetching
  const exams = await fetch('https://goldlincschools.onrender.com/api/exam').then(r => r.json()).catch(() => []);

  // Build UI
  document.getElementById('contentArea').innerHTML = `
    <h2 class="text-2xl font-bold mb-5 text-[#22305a]">Schedule & Merge Exams</h2>
    <form id="mergeScheduleExamForm" class="space-y-4 max-w-xl">
      <div>
        <label>Select Exams to Merge <span class="text-red-500">*</span></label>
        <select name="examIds" id="mergeExamSelect" multiple required class="block w-full rounded border px-3 py-2 mt-1 h-40">
          ${exams.map(e => `<option value="${e._id}">${e.title}</option>`).join('')}
        </select>
        <small>Select two or more exams to merge their questions. Use Ctrl/Cmd to select multiple.</small>
      </div>
      <div id="mergedQuestionsPreview" class="mt-4"></div>
      <div class="mt-4">
        <label>New Exam Title <span class="text-red-500">*</span></label>
        <input type="text" name="mergedTitle" id="mergedTitle" class="block w-full rounded border px-3 py-2 mt-1" required />
      </div>
      <div class="mt-4">
        <label>Duration (minutes) <span class="text-red-500">*</span></label>
        <input type="number" name="duration" id="mergedDuration" class="block w-full rounded border px-3 py-2 mt-1" min="1" required />
      </div>
      <div class="mt-4">
        <label>Schedule Date & Time <span class="text-red-500">*</span></label>
        <input name="scheduledFor" type="datetime-local" required class="block w-full rounded border px-3 py-2 mt-1"/>
      </div>
      <button type="submit" class="cbt-btn mt-2 flex items-center" id="schedule-submit-btn">
        <span> <i class="fa fa-calendar mr-1"></i> Schedule Merged Exam</span>
        <span id="schedule-submit-spinner" style="display:none;" class="ml-2"><i class="fa fa-spinner fa-spin"></i></span>
      </button>
    </form>
    <div id="mergeExamMsg" class="mt-4"></div>
  `;

  // Store merged questions globally in closure
  let mergedQuestions = [];

  // Handler for selecting exams
  document.getElementById('mergeExamSelect').onchange = async function () {
    const selected = Array.from(this.selectedOptions).map(opt => opt.value);
    const previewDiv = document.getElementById('mergedQuestionsPreview');
    if (selected.length < 2) {
      previewDiv.innerHTML = "<div class='text-gray-500'>Select two or more exams to merge.</div>";
      mergedQuestions = [];
      return;
    }
    previewDiv.innerHTML = `<div class="flex items-center text-blue-600 font-semibold py-4"><i class="fa fa-spinner fa-spin"></i> Merging questions...</div>`;

    // Fetch details for selected exams
    const questionSets = await Promise.all(selected.map(id =>
      fetch(`https://goldlincschools.onrender.com/api/exam/${id}`).then(r => r.json())
    ));

    // Merge all questions (track source for display)
    mergedQuestions = [];
    questionSets.forEach(exam => {
      (exam.questions || []).forEach(q => {
        mergedQuestions.push({ ...q, sourceExamTitle: exam.title });
      });
    });

    // Display questions (simple preview)
    previewDiv.innerHTML =
      mergedQuestions.map((q, idx) => `
        <div class="mb-2 p-2 bg-[#f8fafc] rounded border flex items-start gap-3">
          <div class="text-gray-500 mt-1">${idx + 1}.</div>
          <div class="flex-1">
            <div class="font-semibold text-[#22305a]">From: <span class="text-blue-700">${q.sourceExamTitle}</span></div>
            <div class="mb-2">${q.text}</div>
            <ol class="list-decimal ml-5">${(q.options || []).map((o, oi) => `<li>${o.value || o}</li>`).join('')}</ol>
          </div>
        </div>
      `).join('');
  };

  // Form submit (schedule merged exam)
  document.getElementById('mergeScheduleExamForm').onsubmit = async function (e) {
    e.preventDefault();
    const fd = new FormData(this);
    const mergedTitle = fd.get('mergedTitle');
    const duration = Number(fd.get('duration'));
    const scheduledFor = fd.get('scheduledFor');
    const selected = Array.from(document.getElementById('mergeExamSelect').selectedOptions).map(opt => opt.value);
    const previewDiv = document.getElementById('mergedQuestionsPreview');

    // Validation
    if (!mergedTitle || !duration || !scheduledFor || !mergedQuestions.length || selected.length < 2) {
      document.getElementById('mergeExamMsg').innerHTML = `<div class="text-red-600">Please complete all fields and select at least 2 exams.</div>`;
      return;
    }

    // Use class/subject of first selected exam (could allow admin to choose)
    const questionSets = await Promise.all(selected.map(id =>
      fetch(`https://goldlincschools.onrender.com/api/exam/${id}`).then(r => r.json())
    ));
    const firstExam = questionSets[0];

    // Loader
    const submitBtn = document.getElementById('schedule-submit-btn');
    const spinner = document.getElementById('schedule-submit-spinner');
    submitBtn.disabled = true;
    spinner.style.display = '';

    // POST the merged exam
    const payload = {
      title: mergedTitle,
      class: firstExam.class,
      subject: firstExam.subject,
      duration,
      questions: mergedQuestions.map(q => ({
        text: q.text,
        options: q.options,
        answer: q.answer,
        score: q.score
      })),
      scheduledFor
    };
    const res = await fetch('https://goldlincschools.onrender.com/api/exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    submitBtn.disabled = false;
    spinner.style.display = 'none';

    if (data.error) {
      document.getElementById('mergeExamMsg').innerHTML = `<div class="text-red-600">${data.error}</div>`;
    } else {
      document.getElementById('mergeExamMsg').innerHTML = `<div class="text-green-600">Merged exam scheduled!</div>`;
      setTimeout(showExams, 1200);
    }
  };
}

  // 4. Results Viewer
  async function showResults() {
    document.getElementById('contentArea').innerHTML = `
      <div class="flex items-center justify-between mb-7">
        <h2 class="text-2xl font-bold text-[#22305a]">Student Results</h2>
      </div>
      <div id="resultsTable" class="overflow-auto"></div>
    `;
    const results = await fetch('https://goldlincschools.onrender.com/api/results').then(r => r.json()).catch(() => []);
    const table = document.getElementById('resultsTable');
    if (!Array.isArray(results) || results.length === 0) {
      table.innerHTML = `<div class="text-center text-gray-500 mt-12">No results found.</div>`; return;
    }
    let html = `<table class="min-w-full border text-left">
      <thead class="bg-[#f6f8fa] text-[#2647a6]">
        <tr>
          <th class="p-3">Student</th>
          <th class="p-3">Class</th>
          <th class="p-3">Subject</th>
          <th class="p-3">Exam Title</th>
          <th class="p-3">Score</th>
          <th class="p-3">Started</th>
          <th class="p-3">Finished</th>
          <th class="p-3">Details</th>
        </tr>
      </thead>
      <tbody>`;
    for (const r of results) {
      html += `<tr class="border-b">
        <td class="p-3">${r.studentName}</td>
        <td class="p-3">${r.className}</td>
        <td class="p-3">${r.subjectName}</td>
        <td class="p-3">${r.examTitle}</td>
        <td class="p-3 font-semibold">${r.score} / ${r.total}</td>
        <td class="p-3">${r.startedAt ? new Date(r.startedAt).toLocaleString() : '-'}</td>
        <td class="p-3">${r.finishedAt ? new Date(r.finishedAt).toLocaleString() : '-'}</td>
        <td class="p-3"><button class="text-blue-700" onclick="viewResult('${r._id}')"><i class="fa fa-eye"></i></button></td>
      </tr>`;
    }
    html += `</tbody></table>`;
    table.innerHTML = html;
  }

  // 5. Student Activity
  async function showStudentActivity() {
    document.getElementById('contentArea').innerHTML = `
      <h2 class="text-2xl font-bold mb-5 text-[#22305a]">Student Activity</h2>
      <div id="activityTable" class="overflow-auto"></div>
    `;
    const acts = await fetch('https://goldlincschools.onrender.com/api/activity').then(r => r.json()).catch(() => []);
    const table = document.getElementById('activityTable');
    if (!Array.isArray(acts) || acts.length === 0) {
      table.innerHTML = `<div class="text-center text-gray-500 mt-12">No activity found.</div>`; return;
    }
    let html = `<table class="min-w-full border text-left">
      <thead class="bg-[#f6f8fa] text-[#2647a6]">
        <tr>
          <th class="p-3">Student</th>
          <th class="p-3">Class</th>
          <th class="p-3">Exam</th>
          <th class="p-3">Started</th>
          <th class="p-3">Finished</th>
          <th class="p-3">Status</th>
          <th class="p-3">Actions</th>
        </tr>
      </thead>
      <tbody>`;
    for (const a of acts) {
      html += `<tr class="border-b">
        <td class="p-3">${a.studentName}</td>
        <td class="p-3">${a.className}</td>
        <td class="p-3">${a.examTitle}</td>
        <td class="p-3">${a.startedAt ? new Date(a.startedAt).toLocaleString() : '-'}</td>
        <td class="p-3">${a.finishedAt ? new Date(a.finishedAt).toLocaleString() : '-'}</td>
        <td class="p-3">${a.status || ''}</td>
        <td class="p-3">
          <button title="View" class="text-blue-700" onclick="viewActivity('${a._id}')"><i class="fa fa-eye"></i></button>
        </td>
      </tr>`;
    }
    html += `</tbody></table>`;
    table.innerHTML = html;
  }

  // --- ACTIONS ---
  window.viewExam = async function(id) {
    const ex = await fetch(`https://goldlincschools.onrender.com/api/exam/${id}`).then(r=>r.json());
    if(ex.error){alert(ex.error); return;}
    document.getElementById('contentArea').innerHTML = `
      <h2 class="text-2xl font-bold mb-5 text-[#22305a]">Exam Detail</h2>
      <div class="mb-3"><b>Title:</b> ${ex.title}</div>
      <div class="mb-3"><b>Class:</b> ${ex.className}</div>
      <div class="mb-3"><b>Subject:</b> ${ex.subjectName}</div>
      <div class="mb-3"><b>Duration:</b> ${ex.duration} mins</div>
      <div class="mb-3"><b>Status:</b> ${ex.status}</div>
      <div class="mb-3"><b>Scheduled:</b> ${ex.scheduledFor ? new Date(ex.scheduledFor).toLocaleString() : '-'}</div>
      <div class="mb-3"><b>Questions:</b>${Array.isArray(ex.questions) ? ex.questions.map((q,i) => `
        <div class="mb-2">
          <b>Q${i+1} (${q.score||1} mark):</b> <div class="border rounded p-2 mb-1 bg-[#f9fafd]">${q.text}</div>
          <div class="ml-3">Options:
            <ol class="list-decimal ml-4">
            ${(q.options||[]).map((o,oi)=>`<li class="${oi==q.answer?'text-green-700 font-bold':''}">${o}</li>`).join('')}
            </ol>
          </div>
          <div class="ml-3">Correct: <b>${String.fromCharCode(65 + (q.answer||0))}</b></div>
        </div>
      `).join('') : ''}
      </div>
      <button class="cbt-btn" onclick="showExams()"><i class="fa fa-arrow-left mr-1"></i> Back to Exams</button>
    `;
  }
  window.editExam = async function(id) {
    const ex = await fetch(`https://goldlincschools.onrender.com/api/exam/${id}`).then(r=>r.json());
    if(ex.error){alert(ex.error); return;}
    alert('Edit Exam is not implemented for advanced question editor. Please delete and re-upload for now.');
    showExams();
  }
  window.deleteExam = async function(id) {
    if (!confirm('Delete this exam?')) return;
    const res = await fetch(`https://goldlincschools.onrender.com/api/exam/${id}`,{method:'DELETE'}).then(r=>r.json());
    if(res.error){alert(res.error);} else {showExams();}
  }
  window.stopExam = async function(id) {
    if (!confirm('Stop this exam for all students?')) return;
    await fetch(`https://goldlincschools.onrender.com/api/exam/${id}/stop`,{method:'POST'});
    showExams();
  }
  window.viewResult = async function(id) {
    const r = await fetch(`https://goldlincschools.onrender.com/api/result/${id}`).then(r=>r.json());
    if(r.error){alert(r.error); return;}
    document.getElementById('contentArea').innerHTML = `
      <h2 class="text-2xl font-bold mb-5 text-[#22305a]">Result Detail</h2>
      <div class="mb-3"><b>Student:</b> ${r.studentName}</div>
      <div class="mb-3"><b>Class:</b> ${r.className}</div>
      <div class="mb-3"><b>Subject:</b> ${r.subjectName}</div>
      <div class="mb-3"><b>Exam Title:</b> ${r.examTitle}</div>
      <div class="mb-3"><b>Score:</b> ${r.score} / ${r.total}</div>
      <div class="mb-3"><b>Started:</b> ${r.startedAt ? new Date(r.startedAt).toLocaleString() : '-'}</div>
      <div class="mb-3"><b>Finished:</b> ${r.finishedAt ? new Date(r.finishedAt).toLocaleString() : '-'}</div>
      <div class="mb-3"><b>Answers:</b><pre class="bg-[#f8fafc] rounded p-3 text-sm">${JSON.stringify(r.answers, null, 2)}</pre></div>
      <button class="cbt-btn" onclick="showResults()"><i class="fa fa-arrow-left mr-1"></i> Back to Results</button>
    `;
  }
  window.viewActivity = async function(id) {
    const a = await fetch(`https://goldlincschools.onrender.com/api/activity/${id}`).then(r=>r.json());
    if(a.error){alert(a.error); return;}
    document.getElementById('contentArea').innerHTML = `
      <h2 class="text-2xl font-bold mb-5 text-[#22305a]">Student Activity Detail</h2>
      <div class="mb-3"><b>Student:</b> ${a.studentName}</div>
      <div class="mb-3"><b>Class:</b> ${a.className}</div>
      <div class="mb-3"><b>Exam:</b> ${a.examTitle}</div>
      <div class="mb-3"><b>Started:</b> ${a.startedAt ? new Date(a.startedAt).toLocaleString() : '-'}</div>
      <div class="mb-3"><b>Finished:</b> ${a.finishedAt ? new Date(a.finishedAt).toLocaleString() : '-'}</div>
      <div class="mb-3"><b>Status:</b> ${a.status}</div>
      <div class="mb-3"><b>Activity Log:</b><pre class="bg-[#f8fafc] rounded p-3 text-sm">${JSON.stringify(a.activityLog, null, 2)}</pre></div>
      <button class="cbt-btn" onclick="showStudentActivity()"><i class="fa fa-arrow-left mr-1"></i> Back to Activity</button>
    `;
  }

  // 6. Logout
  function logout() {
    fetch('https://goldlincschools.onrender.com/api/logout',{method:'POST'}).finally(()=>location.href='/login.html');
  }

  // --- INITIALIZE DEFAULT PAGE ---
  showExams();
