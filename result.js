// Sample data for demonstration
const sampleResults = [
    {
        id: "STU001",
        name: "Adaobi Umeh",
        class: "SS3",
        subject: "Mathematics",
        score: 95,
        grade: "A1",
        remarks: "Excellent",
        status: "Published"
    },
    {
        id: "STU002",
        name: "Chinedu Okafor",
        class: "SS3",
        subject: "English Language",
        score: 88,
        grade: "B2",
        remarks: "Very Good",
        status: "Draft"
    },
    {
        id: "STU003",
        name: "Fatima Bello",
        class: "JSS2",
        subject: "Biology",
        score: 70,
        grade: "C4",
        remarks: "Good",
        status: "Pending"
    }
];

function renderResultsTable(results) {
    const tbody = document.getElementById('resultsTbody');
    tbody.innerHTML = '';
    results.forEach((result, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="row-check" data-idx="${idx}"></td>
            <td>${result.id}</td>
            <td>${result.name}</td>
            <td>${result.class}</td>
            <td>${result.subject}</td>
            <td>${result.score}</td>
            <td>${result.grade}</td>
            <td>${result.remarks}</td>
            <td class="status-${result.status.toLowerCase()}">${result.status}</td>
            <td>
                <a class="action-btn edit" title="Edit" href="edit-result.html?id=${result.id}">✏️</a>
                <a class="action-btn delete" title="Delete" href="delete-result.html?id=${result.id}">🗑️</a>
                <a class="action-btn publish" title="Publish" href="publish-result.html?id=${result.id}">📢</a>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    renderResultsTable(sampleResults);

    // Select all checkboxes
    document.getElementById('selectAll').addEventListener('change', function(e) {
        document.querySelectorAll('.row-check').forEach(cb => cb.checked = e.target.checked);
    });

    // Filter button
    document.getElementById('filterBtn').onclick = function() {
        const classVal = document.getElementById('classSelect').value;
        const subjectVal = document.getElementById('subjectSelect').value;
        const searchVal = document.getElementById('searchStudentInput').value.trim().toLowerCase();
        let filtered = sampleResults.filter(r => {
            let match = true;
            if (classVal !== "All Classes" && r.class !== classVal) match = false;
            if (subjectVal !== "All Subjects" && r.subject !== subjectVal) match = false;
            if (searchVal && !(r.name.toLowerCase().includes(searchVal) || r.id.toLowerCase().includes(searchVal))) match = false;
            return match;
        });
        renderResultsTable(filtered);
    };

    // Page links for action buttons
    document.getElementById('uploadResultsBtn').onclick = () => window.location.href = "upload-results-manual.html";
    document.getElementById('bulkEditBtn').onclick = () => window.location.href = "bulk-edit-results.html";
    document.getElementById('publishResultsBtn').onclick = () => window.location.href = "publish-results.html";
    document.getElementById('exportCSVBtn').onclick = () => window.location.href = "export-csv.html";
    document.getElementById('manageTemplatesBtn').onclick = () => window.location.href = "manage-templates.html";

    // Statistics Modal
    const statsModal = document.getElementById('statisticsModal');
    document.getElementById('viewStatsBtn').onclick = function() {
        statsModal.style.display = 'block';
        renderStatsChart();
    };
    document.getElementById('closeStatsModal').onclick = function() {
        statsModal.style.display = 'none';
    };
    window.onclick = function(event) {
        if (event.target == statsModal) statsModal.style.display = 'none';
    };
});

function renderStatsChart() {
    if (window.resultsStatsChart) {
        window.resultsStatsChart.destroy();
    }
    const ctx = document.getElementById('resultsStatsChart').getContext('2d');
    const gradeCounts = { 'A1': 1, 'B2': 1, 'C4': 1, 'Others': 0 };
    window.resultsStatsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(gradeCounts),
            datasets: [{
                label: 'Number of Students',
                data: Object.values(gradeCounts),
                backgroundColor: ['#20c997', '#007bff', '#ffc107', '#888']
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
