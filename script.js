const STORAGE_KEY = 'gbs_attendance_records';
let records = [];

function loadRecords() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      records = JSON.parse(stored);
    }
  } catch (e) {
    records = [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

const form = document.getElementById('attendanceForm');
const tbody = document.getElementById('attendanceTableBody');
const totalCountEl = document.getElementById('totalCount');
const avgAttendanceEl = document.getElementById('avgAttendance');
const excellentCountEl = document.getElementById('excellentCount');
const poorCountEl = document.getElementById('poorCount');
const totalActiveEl = document.getElementById('totalActiveEmployees');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');
const exportBtn = document.getElementById('exportBtn');
const toast = document.getElementById('toast');
const toastMsg = document.querySelector('.toast-msg');
const toastIcon = document.querySelector('.toast-icon');
const formSuccessMsg = document.getElementById('formSuccessMsg');
const currentDateEl = document.getElementById('currentDate');

const empId = document.getElementById('empId');
const empName = document.getElementById('empName');
const department = document.getElementById('department');
const workingDays = document.getElementById('workingDays');
const presentDays = document.getElementById('presentDays');
const leaveDays = document.getElementById('leaveDays');

const empIdError = document.getElementById('empIdError');
const empNameError = document.getElementById('empNameError');
const departmentError = document.getElementById('departmentError');
const workingDaysError = document.getElementById('workingDaysError');
const presentDaysError = document.getElementById('presentDaysError');
const leaveDaysError = document.getElementById('leaveDaysError');

const rankingTbody = document.getElementById('rankingTableBody');
const rankFilter = document.getElementById('rankFilter');
const rankCount = document.getElementById('rankCount');
const topPerformerName = document.getElementById('topPerformerName');
const topPerformerPct = document.getElementById('topPerformerPct');
const midPerformerName = document.getElementById('midPerformerName');
const midPerformerPct = document.getElementById('midPerformerPct');
const lowPerformerName = document.getElementById('lowPerformerName');
const lowPerformerPct = document.getElementById('lowPerformerPct');

const reportTbody = document.getElementById('reportTableBody');
const reportSearch = document.getElementById('reportSearch');
const reportTotalCount = document.getElementById('reportTotalCount');
const reportExcellentCount = document.getElementById('reportExcellentCount');
const reportGoodCount = document.getElementById('reportGoodCount');
const reportAverageCount = document.getElementById('reportAverageCount');
const reportPoorCount = document.getElementById('reportPoorCount');
const reportAvgPct = document.getElementById('reportAvgPct');
const exportFullReportBtn = document.getElementById('exportFullReportBtn');

const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const menuItems = document.querySelectorAll('.sidebar-menu .menu-item[data-page]');

function setCurrentDate() {
  const now = new Date();
  const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
  currentDateEl.textContent = now.toLocaleDateString('en-US', options);
}
setCurrentDate();

function getStatus(percentage) {
  if (percentage >= 90) return { label: 'Excellent', class: 'status-excellent', icon: 'fa-circle-check' };
  if (percentage >= 75) return { label: 'Good', class: 'status-good', icon: 'fa-arrow-up' };
  if (percentage >= 50) return { label: 'Average', class: 'status-average', icon: 'fa-minus' };
  return { label: 'Poor', class: 'status-poor', icon: 'fa-circle-exclamation' };
}

function calcPercentage(present, working) {
  if (!working || working <= 0) return 0;
  return Math.round((present / working) * 100);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getRankMedal(index) {
  if (index === 0) return '<span class="rank-medal gold">1</span>';
  if (index === 1) return '<span class="rank-medal silver">2</span>';
  if (index === 2) return '<span class="rank-medal bronze">3</span>';
  return `<span class="rank-medal default">${index + 1}</span>`;
}

let toastTimer = null;

function showToast(message, type = 'success') {
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    info: 'fa-circle-info',
  };

  toastIcon.className = `toast-icon fas ${icons[type] || icons.success}`;
  toastMsg.textContent = message;
  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function clearErrors() {
  document.querySelectorAll('.form-group input, .form-group select').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.error-msg').forEach(el => (el.textContent = ''));
}

function setError(input, errorEl, msg) {
  if (msg) {
    input.classList.add('error');
    errorEl.textContent = msg;
    return false;
  }
  input.classList.remove('error');
  errorEl.textContent = '';
  return true;
}

function validateForm() {
  let valid = true;
  clearErrors();

  valid &= setError(empId, empIdError, empId.value.trim() ? '' : 'Employee ID is required.');
  valid &= setError(empName, empNameError, empName.value.trim() ? '' : 'Employee Name is required.');
  valid &= setError(department, departmentError, department.value ? '' : 'Please select a department.');

  const wd = parseInt(workingDays.value, 10);
  valid &= setError(workingDays, workingDaysError,
    workingDays.value.trim() && !isNaN(wd) && wd >= 1 ? '' : 'Must be at least 1.');

  const pd = parseInt(presentDays.value, 10);
  let pdMsg = '';
  if (!presentDays.value.trim() || isNaN(pd) || pd < 0) pdMsg = 'Cannot be negative.';
  else if (!isNaN(wd) && pd > wd) pdMsg = `Present days (${pd}) exceed working days (${wd}).`;
  valid &= setError(presentDays, presentDaysError, pdMsg);

  const ld = parseInt(leaveDays.value, 10);
  let ldMsg = '';
  if (!leaveDays.value.trim() || isNaN(ld) || ld < 0) ldMsg = 'Cannot be negative.';
  else if (!isNaN(wd) && ld > wd) ldMsg = `Leave days (${ld}) exceed working days (${wd}).`;
  valid &= setError(leaveDays, leaveDaysError, ldMsg);

  if (valid && empId.value.trim()) {
    const dup = records.find(r => r.empId === empId.value.trim());
    if (dup) {
      setError(empId, empIdError, `ID "${empId.value.trim()}" already exists.`);
      valid = false;
    }
  }

  return !!valid;
}

function renderTable() {
  if (records.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="10">
          <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No attendance records found</p>
            <span>Fill the form to add a new record</span>
          </div>
        </td>
      </tr>
    `;
    totalCountEl.textContent = '0';
    avgAttendanceEl.textContent = '—';
    excellentCountEl.textContent = '0';
    poorCountEl.textContent = '0';
    totalActiveEl.textContent = '0 Active';
    return;
  }

  let totalPct = 0;
  let excellent = 0;
  let poor = 0;

  let html = '';
  records.forEach((rec, i) => {
    const pct = calcPercentage(rec.presentDays, rec.workingDays);
    const status = getStatus(pct);
    totalPct += pct;
    if (pct >= 90) excellent++;
    if (pct < 50) poor++;

    html += `
      <tr style="animation-delay:${i * 0.04}s">
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(rec.empId)}</strong></td>
        <td>${escapeHtml(rec.empName)}</td>
        <td>${escapeHtml(rec.department)}</td>
        <td>${rec.workingDays}</td>
        <td>${rec.presentDays}</td>
        <td>${rec.leaveDays}</td>
        <td class="percentage-cell">${pct}%</td>
        <td><span class="status-badge ${status.class}"><i class="fas ${status.icon}"></i>${status.label}</span></td>
        <td><button class="btn-icon-only" onclick="deleteRecord(${i})" title="Delete"><i class="fas fa-trash-can"></i></button></td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  totalCountEl.textContent = records.length;
  avgAttendanceEl.textContent = Math.round(totalPct / records.length) + '%';
  excellentCountEl.textContent = excellent;
  poorCountEl.textContent = poor;
  totalActiveEl.textContent = records.length + ' Active';
}

window.deleteRecord = function (index) {
  records.splice(index, 1);
  saveRecords();
  renderTable();
  renderRankings();
  renderReports();
  showToast('Record deleted.', 'info');
};

function resetFormFields() {
  form.reset();
  clearErrors();
  formSuccessMsg.classList.remove('show');
}

form.addEventListener('submit', function (e) {
  e.preventDefault();

  if (!validateForm()) return;

  const record = {
    empId: empId.value.trim(),
    empName: empName.value.trim(),
    department: department.value,
    workingDays: parseInt(workingDays.value, 10),
    presentDays: parseInt(presentDays.value, 10),
    leaveDays: parseInt(leaveDays.value, 10),
  };

  records.push(record);
  saveRecords();
  renderTable();
  renderRankings();
  renderReports();

  formSuccessMsg.classList.add('show');
  setTimeout(() => formSuccessMsg.classList.remove('show'), 2500);

  showToast(`Record saved for ${record.empName}.`, 'success');
  resetFormFields();
});

resetBtn.addEventListener('click', resetFormFields);

exportBtn.addEventListener('click', function () {
  if (records.length === 0) {
    showToast('No data to export.', 'error');
    return;
  }

  const data = records.map(r => {
    const pct = calcPercentage(r.presentDays, r.workingDays);
    return {
      ID: r.empId,
      Name: r.empName,
      Department: r.department,
      'Working Days': r.workingDays,
      'Present Days': r.presentDays,
      'Leave Days': r.leaveDays,
      'Attendance %': pct + '%',
      Status: getStatus(pct).label,
    };
  });

  console.log('%c===== GBS Attendance Report =====', 'font-weight:bold;font-size:14px;color:#4f46e5;');
  console.table(data);
  showToast('Exported to console (F12 → Console tab).', 'info');
});

function renderRankings() {
  const filter = rankFilter.value;

  let filtered = [...records];

  if (filter !== 'all') {
    filtered = filtered.filter(r => r.department === filter);
  }

  filtered.sort((a, b) => {
    const pctA = calcPercentage(a.presentDays, a.workingDays);
    const pctB = calcPercentage(b.presentDays, b.workingDays);
    return pctB - pctA;
  });

  rankCount.textContent = filtered.length + ' Employees';

  if (filtered.length === 0) {
    topPerformerName.textContent = '—';
    topPerformerPct.textContent = '0%';
    midPerformerName.textContent = '—';
    midPerformerPct.textContent = '0%';
    lowPerformerName.textContent = '—';
    lowPerformerPct.textContent = '0%';

    rankingTbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">
          <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No records to rank</p>
            <span>Add attendance records from the Dashboard</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const top = filtered[0];
  const topPct = calcPercentage(top.presentDays, top.workingDays);
  topPerformerName.textContent = top.empName;
  topPerformerPct.textContent = topPct + '%';

  const midIdx = Math.floor(filtered.length / 2);
  const mid = filtered[midIdx];
  const midPct = calcPercentage(mid.presentDays, mid.workingDays);
  midPerformerName.textContent = mid.empName;
  midPerformerPct.textContent = midPct + '%';

  const low = filtered[filtered.length - 1];
  const lowPct = calcPercentage(low.presentDays, low.workingDays);
  lowPerformerName.textContent = low.empName;
  lowPerformerPct.textContent = lowPct + '%';

  let html = '';
  filtered.forEach((rec, i) => {
    const pct = calcPercentage(rec.presentDays, rec.workingDays);
    const status = getStatus(pct);

    html += `
      <tr style="animation-delay:${i * 0.03}s">
        <td>${getRankMedal(i)}</td>
        <td><strong>${escapeHtml(rec.empId)}</strong></td>
        <td>${escapeHtml(rec.empName)}</td>
        <td>${escapeHtml(rec.department)}</td>
        <td class="percentage-cell">${pct}%</td>
        <td><span class="status-badge ${status.class}"><i class="fas ${status.icon}"></i>${status.label}</span></td>
      </tr>
    `;
  });

  rankingTbody.innerHTML = html;
}

rankFilter.addEventListener('change', renderRankings);

function renderReports() {
  const searchTerm = reportSearch.value.toLowerCase().trim();

  let filtered = [...records];

  if (searchTerm) {
    filtered = filtered.filter(r =>
      r.empId.toLowerCase().includes(searchTerm) ||
      r.empName.toLowerCase().includes(searchTerm)
    );
  }

  let excellent = 0, good = 0, average = 0, poor = 0;
  let totalPct = 0;

  filtered.forEach(r => {
    const pct = calcPercentage(r.presentDays, r.workingDays);
    totalPct += pct;
    if (pct >= 90) excellent++;
    else if (pct >= 75) good++;
    else if (pct >= 50) average++;
    else poor++;
  });

  reportTotalCount.textContent = filtered.length;
  reportExcellentCount.textContent = excellent;
  reportGoodCount.textContent = good;
  reportAverageCount.textContent = average;
  reportPoorCount.textContent = poor;
  reportAvgPct.textContent = filtered.length > 0 ? Math.round(totalPct / filtered.length) + '%' : '—';

  if (filtered.length === 0) {
    reportTbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="9">
          <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No records found</p>
            <span>${searchTerm ? 'Try a different search term' : 'Add attendance records from the Dashboard'}</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  filtered.forEach((rec, i) => {
    const pct = calcPercentage(rec.presentDays, rec.workingDays);
    const status = getStatus(pct);

    html += `
      <tr style="animation-delay:${i * 0.03}s">
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(rec.empId)}</strong></td>
        <td>${escapeHtml(rec.empName)}</td>
        <td>${escapeHtml(rec.department)}</td>
        <td>${rec.workingDays}</td>
        <td>${rec.presentDays}</td>
        <td>${rec.leaveDays}</td>
        <td class="percentage-cell">${pct}%</td>
        <td><span class="status-badge ${status.class}"><i class="fas ${status.icon}"></i>${status.label}</span></td>
      </tr>
    `;
  });

  reportTbody.innerHTML = html;
}

reportSearch.addEventListener('input', renderReports);

exportFullReportBtn.addEventListener('click', function () {
  if (records.length === 0) {
    showToast('No data to export.', 'error');
    return;
  }

  const headers = ['#', 'Employee ID', 'Name', 'Department', 'Working Days', 'Present Days', 'Leave Days', 'Attendance %', 'Status'];
  const rows = records.map((r, i) => {
    const pct = calcPercentage(r.presentDays, r.workingDays);
    return [i + 1, r.empId, r.empName, r.department, r.workingDays, r.presentDays, r.leaveDays, pct + '%', getStatus(pct).label];
  });

  const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `GBS_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);

  showToast('CSV report downloaded.', 'success');
});

function switchPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  const target = document.getElementById('page-' + pageId);
  if (target) {
    target.classList.add('active');
  }

  menuItems.forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageId);
  });

  closeSidebar();

  if (pageId === 'attendance') renderRankings();
  if (pageId === 'reports') renderReports();
}

menuItems.forEach(item => {
  item.addEventListener('click', function (e) {
    e.preventDefault();
    const page = this.dataset.page;
    if (page === 'logout') {
      showToast('Logged out successfully.', 'info');
      return;
    }
    switchPage(page);
  });
});

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

hamburgerBtn.addEventListener('click', function () {
  if (sidebar.classList.contains('open')) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

sidebarOverlay.addEventListener('click', closeSidebar);

window.addEventListener('resize', function () {
  if (window.innerWidth > 768) {
    closeSidebar();
  }
});

empId.addEventListener('blur', () => {
  setError(empId, empIdError, empId.value.trim() ? '' : 'Employee ID is required.');
});

empName.addEventListener('blur', () => {
  setError(empName, empNameError, empName.value.trim() ? '' : 'Employee Name is required.');
});

department.addEventListener('blur', () => {
  setError(department, departmentError, department.value ? '' : 'Please select a department.');
});

workingDays.addEventListener('blur', () => {
  const wd = parseInt(workingDays.value, 10);
  setError(workingDays, workingDaysError,
    workingDays.value.trim() && !isNaN(wd) && wd >= 1 ? '' : 'Must be at least 1.');
});

function validatePresentDays() {
  const pd = parseInt(presentDays.value, 10);
  const wd = parseInt(workingDays.value, 10);
  if (!presentDays.value.trim() || isNaN(pd) || pd < 0) {
    setError(presentDays, presentDaysError, 'Cannot be negative.');
  } else if (!isNaN(wd) && pd > wd) {
    setError(presentDays, presentDaysError, `Present days (${pd}) exceed working days (${wd}).`);
  } else {
    setError(presentDays, presentDaysError, '');
  }
}

function validateLeaveDays() {
  const ld = parseInt(leaveDays.value, 10);
  const wd = parseInt(workingDays.value, 10);
  if (!leaveDays.value.trim() || isNaN(ld) || ld < 0) {
    setError(leaveDays, leaveDaysError, 'Cannot be negative.');
  } else if (!isNaN(wd) && ld > wd) {
    setError(leaveDays, leaveDaysError, `Leave days (${ld}) exceed working days (${wd}).`);
  } else {
    setError(leaveDays, leaveDaysError, '');
  }
}

presentDays.addEventListener('blur', validatePresentDays);
leaveDays.addEventListener('blur', validateLeaveDays);

presentDays.addEventListener('input', () => { if (leaveDays.value.trim()) validateLeaveDays(); });
leaveDays.addEventListener('input', () => { if (presentDays.value.trim()) validatePresentDays(); });

loadRecords();
renderTable();
renderRankings();
renderReports();

console.log('%c GBS Attendance Management v2.0 ',
  'background:#4f46e5;color:#fff;font-size:13px;padding:6px 12px;border-radius:4px;font-weight:600;');
console.log(`%c ${records.length} records loaded from localStorage`, 'color:#6b7280;font-size:12px;');