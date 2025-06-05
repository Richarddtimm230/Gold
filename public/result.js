// Fetch results from backend and render table

async function fetchResultsAndRender() {
    const statusEl = document.getElementById('resultsStatus');
    try {
        // You may want to build a query string based on filters here
        const response = await fetch('/api/results'); // Adjust endpoint as needed
        if (!response.ok) throw new Error('Network response was not ok');
        const results = await response.json();

        // results should be an array of result objects
        renderResultsTable(results);
        if (statusEl) statusEl.textContent = '';
        renderStatsChart(results);
    } catch (err) {
        if (statusEl) {
            statusEl.style.color = "#dc3545";
            statusEl.textContent = "❌ Failed to load results: " + err.message;
        }
    }
}

function renderResultsTable(results) {
    const tbody = document.getElementById('resultsTbody');
    tbody.innerHTML = '';
    results.forEach((result, idx) => {
        tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="row-check" data-idx="${idx}"></td>
            <td>${result.student_id || (result.student && result.student.student_id) || ''}</td>
            <td>${result.student_name || (result.student && result.student.name) || ''}</td>
            <td>${result.class_name || (result.class && result.class.name) || ''}</td>
            <td>${result.subject_name || (result.subject && result.subject.name) || ''}</td>
            <td>${result.score}</td>
            <td>${result.grade}</td>
            <td>${result.remarks}</td>
            <td class="status-${(result.status || '').toLowerCase()}">${result.status}</td>
            <td>
                <a class="action-btn edit" title="Edit" href="edit-result.html?id=${result._id}">✏️</a>
                <a class="action-btn delete" title="Delete" href="delete-result.html?id=${result._id}">🗑️</a>
                <a class="action-btn publish" title="Publish" href="publish-result.html?id=${result._id}">📢</a>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    fetchResultsAndRender();

    // Select all checkboxes
    document.getElementById('selectAll').addEventListener('change', function(e) {
        document.querySelectorAll('.row-check').forEach(cb => cb.checked = e.target.checked);
    });

    // Filter button
    document.getElementById('filterBtn').onclick = async function() {
        const classVal = document.getElementById('classSelect').value;
        const subjectVal = document.getElementById('subjectSelect').value;
        const sessionVal = document.getElementById('sessionSelect').value;
        const termVal = document.getElementById('termSelect').value;
        const searchVal = document.getElementById('searchStudentInput').value.trim().toLowerCase();
        let query = [];
        if (classVal !== "All Classes") query.push(`class=${encodeURIComponent(classVal)}`);
        if (subjectVal !== "All Subjects") query.push(`subject=${encodeURIComponent(subjectVal)}`);
        if (sessionVal) query.push(`session=${encodeURIComponent(sessionVal)}`);
        if (termVal) query.push(`term=${encodeURIComponent(termVal)}`);
        if (searchVal) query.push(`search=${encodeURIComponent(searchVal)}`);
        const url = '/api/results' + (query.length ? '?' + query.join('&') : '');
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            const filtered = await response.json();
            renderResultsTable(filtered);
            renderStatsChart(filtered);
        } catch (err) {
            const statusEl = document.getElementById('resultsStatus');
            if (statusEl) {
                statusEl.style.color = "#dc3545";
                statusEl.textContent = "❌ Failed to filter results: " + err.message;
            }
        }
    };

    // Page links for action buttons
    document.getElementById('uploadResultsBtn').onclick = () => window.location.href = "upload-results.html";
    document.getElementById('bulkEditBtn').onclick = () => window.location.href = "bulk-edit-results.html";
    document.getElementById('publishResultsBtn').onclick = () => window.location.href = "publish-results.html";
    document.getElementById('exportCSVBtn').onclick = () => window.location.href = "export-csv.html";
    document.getElementById('manageTemplatesBtn').onclick = () => window.location.href = "manage-templates.html";

    // Statistics Modal
    const statsModal = document.getElementById('statisticsModal');
    document.getElementById('viewStatsBtn').onclick = function() {
        statsModal.style.display = 'block';
        // Optionally re-render chart with current table data
    };
    document.getElementById('closeStatsModal').onclick = function() {
        statsModal.style.display = 'none';
    };
    window.onclick = function(event) {
        if (event.target == statsModal) statsModal.style.display = 'none';
    };
});

function renderStatsChart(results) {
    // Calculate grade counts
    const gradeCounts = {};
    if (Array.isArray(results)) {
        results.forEach(r => {
            let grade = r.grade || "Others";
            if (!gradeCounts[grade]) gradeCounts[grade] = 0;
            gradeCounts[grade]++;
        });
    }
    if (!Object.keys(gradeCounts).length) {
        gradeCounts["No Data"] = 1;
    }

    if (window.resultsStatsChart) {
        window.resultsStatsChart.destroy();
    }
    const ctx = document.getElementById('resultsStatsChart').getContext('2d');
    window.resultsStatsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(gradeCounts),
            datasets: [{
                label: 'Number of Students',
                data: Object.values(gradeCounts),
                backgroundColor: ['#20c997', '#007bff', '#ffc107', '#888', '#6f42c1', '#ff9800', '#b22234']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Number of Students' }
                }
            }
        }
    });
}
