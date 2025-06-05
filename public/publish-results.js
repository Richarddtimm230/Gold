// Sample "Draft" and "Pending" results (would come from backend in real use)
const unpublishedResults = [
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

let filteredResults = [...unpublishedResults];

function renderPublishTable(results) {
    const tbody = document.getElementById('publishResultsTbody');
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
        `;
        tbody.appendChild(tr);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    renderPublishTable(filteredResults);

    // Select all checkboxes
    document.getElementById('selectAll').addEventListener('change', function(e) {
        document.querySelectorAll('.row-check').forEach(cb => cb.checked = e.target.checked);
    });

    // Filter button
    document.getElementById('filterBtn').onclick = function() {
        const classVal = document.getElementById('classSelect').value;
        const subjectVal = document.getElementById('subjectSelect').value;
        // Only filter by class and subject for demo
        filteredResults = unpublishedResults.filter(r => {
            let match = true;
            if (classVal !== "All Classes" && r.class !== classVal) match = false;
            if (subjectVal !== "All Subjects" && r.subject !== subjectVal) match = false;
            return match;
        });
        renderPublishTable(filteredResults);
    };

    // Publish selected
    document.getElementById('publishForm').onsubmit = function(e) {
        e.preventDefault();
        const checked = Array.from(document.querySelectorAll('.row-check')).map((cb, idx) => cb.checked ? idx : -1).filter(idx => idx >= 0);
        if (checked.length === 0) {
            document.getElementById('publishStatus').textContent = "Please select at least one result to publish.";
            document.getElementById('publishStatus').style.color = "#dc3545";
            return;
        }
        // Simulate publishing
        checked.forEach(idx => {
            filteredResults[idx].status = "Published";
        });
        document.getElementById('publishStatus').textContent = "Selected results published successfully!";
        document.getElementById('publishStatus').style.color = "#20c997";
        renderPublishTable(filteredResults);
    };
});
