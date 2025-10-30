// dashboard.js
// requires supabase-client.js

const BUCKET = 'patient-images'; // make sure to create this bucket in Supabase

// ensure logged-in user
async function checkAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

async function uploadPatient() {
  const user = await checkAuth();
  if (!user) return;

  const name = document.getElementById('p-name').value;
  const age = parseInt(document.getElementById('p-age').value || '0', 10);
  const phone = document.getElementById('p-phone').value;
  const fileInput = document.getElementById('p-image');
  const file = fileInput.files[0];

  if (!name || !phone || !file) return alert('Please provide name, phone and an image.');

  // create path and upload
  const timestamp = Date.now();
  const path = `${user.id}/${timestamp}_${file.name}`;

  const { data: uploadData, error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
  if (uploadErr) return alert('Upload error: ' + uploadErr.message);

  // get public url
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = urlData?.publicUrl ?? null;

  // optional: call detection API here (send the file or publicUrl to server)
  // For now we'll set detection_result as 'pending'
  const detection_result = 'pending';

  // insert patient record
  const { data: insertData, error: insertErr } = await supabase.from('patients').insert([{
    user_id: user.id,
    name,
    age,
    phone,
    image_path: path,
    image_url: publicUrl,
    detection_result,
  }]);

  if (insertErr) return alert('DB insert error: ' + insertErr.message);

  alert('Saved patient record');
  // clear form
  document.getElementById('p-name').value = '';
  document.getElementById('p-age').value = '';
  document.getElementById('p-phone').value = '';
  document.getElementById('p-image').value = '';

  // reload user's records
  loadMyRecords();
}

async function loadMyRecords() {
  const user = await checkAuth();
  if (!user) return;

  const { data, error } = await supabase.from('patients').select('*').eq('user_id', user.id).order('created_at', {ascending:false});
  if (error) { console.error(error); return; }

  const tbody = document.getElementById('records-body');
  tbody.innerHTML = data.map(r => `
    <tr>
      <td>${escapeHtml(r.name)}</td>
      <td>${r.age ?? ''}</td>
      <td>${escapeHtml(r.phone ?? '')}</td>
      <td>${r.image_url ? `<a href="${r.image_url}" target="_blank"><img class="thumb" src="${r.image_url}" /></a>` : ''}</td>
      <td>${escapeHtml(r.detection_result ?? '')}</td>
      <td>${new Date(r.created_at).toLocaleString()}</td>
    </tr>
  `).join('');
}

function escapeHtml(s='') {
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

// run on page load
document.addEventListener('DOMContentLoaded', () => {
  checkAuth().then(user => {
    if (user) loadMyRecords();
  });
});
