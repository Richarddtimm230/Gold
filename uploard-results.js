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

// Form submission
document.getElementById('manualUploadForm').onsubmit = function(e) {
    e.preventDefault();
    const statusEl = document.getElementById('uploadStatus');
    statusEl.textContent = '';
    // Collect data for demonstration
    const rows = Array.from(document.querySelectorAll('#manualResultsTbody tr')).map(tr => ({
        student_id: tr.querySelector('[name="student_id[]"]').value,
        student_name: tr.querySelector('[name="student_name[]"]').value,
        score: tr.querySelector('[name="score[]"]').value,
        grade: tr.querySelector('[name="grade[]"]').value,
        remarks: tr.querySelector('[name="remarks[]"]').value
    }));
    // Simulate backend upload
    setTimeout(() => {
        statusEl.style.color = "#20c997";
        statusEl.textContent = "✅ Results submitted successfully!";
        // Optionally, reset the form
        // document.getElementById('manualUploadForm').reset();
    }, 900);
};
