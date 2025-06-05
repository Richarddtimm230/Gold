// Add row functionality
document.getElementById('addRowBtn').onclick = () => {
    const tbody = document.getElementById('manualResultsTbody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" name="student_id[]" required></td>
        <td><input type="text" name="student_name[]" required></td>
        <td><input type="number" name="score[]" min="0" max="100" required></td>
        <td><input type="text" name="grade[]" required></td>
        <td><input type="text" name="remarks[]"></td>
        <td>
            <button class="remove-row-btn" type="button" title="Remove row">🗑️</button>
        </td>
    `;
    tbody.appendChild(tr);
};

// Remove row functionality (event delegation)
document.getElementById('manualResultsTbody').onclick = function(e) {
    if (e.target.classList.contains('remove-row-btn')) {
        const tr = e.target.closest('tr');
        if (document.querySelectorAll('#manualResultsTbody tr').length > 1) {
            tr.remove();
        } else {
            // Always keep at least one row
            tr.querySelectorAll('input').forEach(inp => inp.value = '');
        }
    }
};

// Form submission - connect to backend
document.getElementById('manualUploadForm').onsubmit = async function(e) {
    e.preventDefault();
    const statusEl = document.getElementById('uploadStatus');
    statusEl.textContent = '';
    statusEl.style.color = "#222";

    // Collect header data
    const session = document.getElementById('sessionSelect').value;
    const term = document.getElementById('termSelect').value;
    const className = document.getElementById('classSelect').value;
    const subject = document.getElementById('subjectSelect').value;

    // Collect row data
    const rows = Array.from(document.querySelectorAll('#manualResultsTbody tr')).map(tr => ({
        student_id: tr.querySelector('[name="student_id[]"]').value.trim(),
        student_name: tr.querySelector('[name="student_name[]"]').value.trim(),
        score: Number(tr.querySelector('[name="score[]"]').value),
        grade: tr.querySelector('[name="grade[]"]').value.trim(),
        remarks: tr.querySelector('[name="remarks[]"]').value.trim()
    }));

    // Validation: check for required fields
    for (const [i, row] of rows.entries()) {
        if (!row.student_id || !row.student_name || isNaN(row.score) || row.grade === '') {
            statusEl.style.color = "#dc3545";
            statusEl.textContent = `Row ${i + 1}: All fields except Remarks are required.`;
            return;
        }
    }

    // Send to backend
    try {
        statusEl.textContent = "Submitting...";
        const response = await fetch('/api/results/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session,
                term,
                class: className,
                subject,
                results: rows
            })
        });
        const data = await response.json();
        if (data.success) {
            statusEl.style.color = "#20c997";
            statusEl.textContent = `✅ ${data.inserted} result(s) submitted successfully!`;
            // Optionally, reset the form:
            // document.getElementById('manualUploadForm').reset();
        } else {
            statusEl.style.color = "#dc3545";
            statusEl.textContent = "❌ Error: " + (data.error || 'Could not upload results.');
        }
    } catch (err) {
        statusEl.style.color = "#dc3545";
        statusEl.textContent = "❌ Network error: " + err.message;
    }
};
