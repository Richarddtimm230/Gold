// In index.html
(async function(){
  const token = localStorage.getItem('token');
  if (!token) return window.location.href = 'login.html';
  const res = await fetch('https://gold-1-z03x.onrender.com/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
  if (!res.ok) return window.location.href = 'login.html';
  const user = await res.json();
  if (user.role !== 'superadmin') window.location.href = 'login.html';
  // else, allow access
})();

// Chart.js configuration for Monthly Finance Summary
document.addEventListener('DOMContentLoaded', function () {
    const ctx = document.getElementById('financeChart').getContext('2d');
    const months = [
        'Jan 2024','Feb 2024','Mar 2024','Apr 2024','May 2024','Jun 2024',
        'Jul 2024','Aug 2024','Sep 2024','Oct 2024','Nov 2024','Dec 2024',
        'Jan 2025','Feb 2025','Mar 2025','Apr 2025','May 2025','Jun 2025',
        'Jul 2025','Aug 2025','Sep 2025','Oct 2025','Nov 2025','Dec 2025'
    ];
    const incomes = [3500, 1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const expenditures = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Incomes',
                    data: incomes,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40,167,69,0.06)',
                    tension: 0.2,
                    fill: false,
                    pointRadius: 3,
                    pointBackgroundColor: '#28a745'
                },
                {
                    label: 'Expenditures',
                    data: expenditures,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220,53,69,0.06)',
                    tension: 0.2,
                    fill: false,
                    pointRadius: 3,
                    pointBackgroundColor: '#dc3545'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true, position: 'bottom' }
            },
            scales: {
                y: {
                    title: { display: true, text: 'Amount (₦)' },
                    beginAtZero: true,
                    grid: { color: '#e3e8ee' }
                },
                x: {
                    grid: { color: '#e3e8ee' }
                }
            }
        }
    });
});
