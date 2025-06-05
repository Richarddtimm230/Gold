document.getElementById('closeUploadModal').onclick = () => window.location.href = "results.html";

let parsedData = [], headers = [];

document.getElementById('uploadForm').onsubmit = function(e) {
    e.preventDefault();
    document.getElementById('fileErrors').textContent = '';
    const file = document.getElementById('resultsFile').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        let data = evt.target.result;
        let workbook;
        try {
            workbook = XLSX.read(data, {type: 'binary'});
        } catch (err) {
            document.getElementById('fileErrors').textContent = 'Could not read file. Please use a valid Excel or CSV file.';
            return;
        }
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, {header:1, defval: ''});
        if (json.length < 2) {
            document.getElementById('fileErrors').textContent = 'File is empty or headers are missing.';
            return;
        }
        headers = json[0];
        parsedData = json.slice(1);
        showMappingSection(headers);
        showPreviewTable(headers, parsedData);
        document.getElementById('previewSection').style.display = 'block';
    };
    reader.readAsBinaryString(file);
};

function showMappingSection(headers) {
    // Expected: ["Student ID", "Name", "Class", "Subject", "Score", "Grade", "Remarks"]
    const expected = [
        "Student ID", "Student Name", "Class", "Subject", "Score", "Grade", "Remarks"
    ];
    let html = '<b>Column Mapping:</b><br>';
    expected.forEach((exp, idx) => {
        html += `<label>${exp}: <select data-exp="${exp}" class="col-mapping">`;
        headers.forEach((h, hi) => {
            html += `<option value="${hi}" ${exp.toLowerCase()===h.toLowerCase()?'selected':''}>${h}</option>`;
        });
        html += '</select></label>';
    });
    document.getElementById('mappingSection').innerHTML = html;
}

// Validate and preview table
function showPreviewTable(headers, rows) {
    const mapEls = document.querySelectorAll('.col-mapping');
    let mapping = Array.from(mapEls).map(select => +select.value);
    let previewHTML = '<thead><tr>';
    mapEls.forEach(sel => previewHTML += `<th>${sel.options[sel.selectedIndex].text}</th>`);
    previewHTML += '</tr></thead><tbody>';
    rows.slice(0, 10).forEach(row => {
        previewHTML += '<tr>';
        mapping.forEach(idx => {
            const cellValue = row[idx] || '';
            // Validation Example: Score must be number between 0-100
            let cellErr = false;
            if (headers[idx].toLowerCase().includes('score') && (isNaN(cellValue) || cellValue<0 || cellValue>100)) cellErr = true;
            previewHTML += `<td${cellErr?' class="error"':''}>${cellValue}</td>`;
        });
        previewHTML += '</tr>';
    });
    previewHTML += '</tbody>';
    document.getElementById('previewTable').innerHTML = previewHTML;
    // Re-render preview if mapping changes
    document.querySelectorAll('.col-mapping').forEach(sel => sel.onchange = () => showPreviewTable(headers, rows));
}

document.getElementById('confirmUploadBtn').onclick = () => {
    // Simulate upload and validation
    document.getElementById('uploadStatus').innerHTML = '<span style="color:#20c997">✅ Results uploaded successfully!</span>';
};
