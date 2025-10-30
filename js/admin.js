// admin.js
// requires supabase-client.js

const BUCKET = 'patient-images';

// Admin login: checks username/password in admins table (demo only)
async function adminLogin() {
  const username = document.getElementById('admin-username').value;
  const password = document.getElementById('admin-password').value;
  if (!username || !password) return alert('enter credentials');

  const { data, error } = await supabase.from('admins').select('*').eq('username', username).eq('password', password).limit(1).maybeSingle();
  if (error || !data) {
    alert('Invalid admin credentials');
    return;
  }

  // simple client-side flag (not secure). For production, use Auth with roles.
  localStorage.setItem('isAdmin', '1');
  window.location.href = 'admin_dashboard.html';
}

function ensureAdmin() {
  if (localStorage.getItem('isAdmin') !== '1') {
    window.location.href = 'admin.html';
    return false;
  }
  return true;
}

async function loadAllPatients() {
  if (!ensureAdmin()) return;
  const { data, error } = await supabase.from('patients').select('*').order('created_at', {ascending:false});
  if (error) { console.error(error); alert('failed loading patients'); return; }

  const tbody = document.getElementById('patients-body');
  tbody.innerHTML = data.map(r => `
    <tr>
      <td>${escapeHtml(r.name)}</td>
      <td>${r.age ?? ''}</td>
      <td>${escapeHtml(r.phone ?? '')}</td>
      <td>${r.image_url ? `<a href="${r.image_url}" target="_blank"><img class="thumb" src="${r.image_url}" /></a>` : ''}</td>
      <td>${escapeHtml(r.detection_result ?? '')}</td>
      <td>${new Date(r.created_at).toLocaleString()}</td>
      <td class="actions">
        <button onclick="deletePatient('${r.id}', '${r.image_path}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

async function deletePatient(id, imagePath) {
  if (!confirm('Delete this record?')) return;
  // delete DB row
  const { error: delErr } = await supabase.from('patients').delete().eq('id', id);
  if (delErr) { alert('Delete error: ' + delErr.message); return; }

  // optionally delete file in storage
  if (imagePath) {
    await supabase.storage.from(BUCKET).remove([imagePath]).catch(e => console.warn('storage delete:', e));
  }
  alert('Deleted');
  loadAllPatients();
}

async function exportCSV() {
  if (!ensureAdmin()) return;
  // get data
  const { data, error } = await supabase.from('patients').select('*').order('created_at', {ascending:false});
  if (error) return alert('export failed');

  // create CSV
  const rows = [['id','name','age','phone','image_url','detection_result','created_at']];
  data.forEach(r => rows.push([r.id, r.name, r.age, r.phone, r.image_url, r.detection_result, r.created_at]));
  const csv = rows.map(r => r.map(cell => `"${String(cell ?? '').replaceAll('"','""')}"`).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `patients_export_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(s='') {
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

// run admin page setup
document.addEventListener('DOMContentLoaded', () => {
  // if on admin dashboard page, load patients
  if (document.getElementById('patients-body')) {
    if (!ensureAdmin()) return;
    loadAllPatients();
  }
});
