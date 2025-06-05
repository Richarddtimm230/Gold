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
                <button class="action-btn edit" title="Edit">✏️</button>
                <button class="action-btn delete" title="Delete">🗑️</button>
                <button class="action-btn publish" title="Publish">📢</button>
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

    // Demo upload, publish, bulk edit, export, manage templates
    document.getElementById('uploadResultsBtn').onclick = () => alert('Upload Results feature coming soon!');
    document.getElementById('bulkEditBtn').onclick = () => alert('Bulk Edit Results feature coming soon!');
    document.getElementById('publishResultsBtn').onclick = () => alert('Publish Results feature coming soon!');
    document.getElementById('exportCSVBtn').onclick = () => alert('Export CSV feature coming soon!');
    document.getElementById('manageTemplatesBtn').onclick = () => alert('Manage Templates feature coming soon!');

    // Row action buttons (edit/delete/publish)
    document.getElementById('resultsTbody').onclick = function(e) {
        if (e.target.classList.contains('edit')) alert('Edit result feature coming soon!');
        if (e.target.classList.contains('delete')) alert('Delete result feature coming soon!');
        if (e.target.classList.contains('publish')) alert('Publish result feature coming soon!');
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
