// =========================
// IMPORT SUPABASE CLIENT
// =========================
import { supabase } from "./supabase.js";

// =========================
// MAIN ENTRY POINT
// =========================
window.addEventListener("DOMContentLoaded", async () => {
  const { data: { user } } = await supabase.auth.getUser();

  // ✅ Redirect if not logged in
  if (!user) {
    alert("Please login first!");
    window.location.href = "login.html";
    return;
  }

  // ✅ Fetch doctor details
  const { data: doctor, error } = await supabase
    .from("doctors")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !doctor) {
    console.error(error);
    alert("Error loading doctor details.");
    await supabase.auth.signOut();
    window.location.href = "login.html";
    return;
  }

  // ✅ Populate doctor info
  document.getElementById("doctorName").textContent = `${doctor.first_name} ${doctor.last_name}`;
  document.getElementById("doctorEmail").textContent = doctor.email;
  document.getElementById("doctorLicense").textContent = doctor.license_no;

  // ✅ If doctor photo exists, show it
  if (doctor.photo_url) {
    const preview = document.getElementById("previewContainer");
    const imgEl = document.getElementById("previewImage");
    imgEl.src = doctor.photo_url;
    preview.classList.remove("hidden");
  }

  // ✅ Load patient history
  loadPatients(doctor.license_no);
});

// =========================
// IMAGE UPLOAD HANDLER
// =========================
const imageInput = document.getElementById("doctorImage");
const saveBtn = document.getElementById("saveImage");

if (imageInput && saveBtn) {
  imageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const preview = document.getElementById("previewContainer");
      const imgEl = document.getElementById("previewImage");
      imgEl.src = URL.createObjectURL(file);
      preview.classList.remove("hidden");
    }
  });

  saveBtn.addEventListener("click", async () => {
    const file = imageInput.files[0];
    if (!file) {
      alert("Please select an image first!");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Session expired. Please login again.");
      window.location.href = "login.html";
      return;
    }

    const filePath = `${user.id}/${file.name}`;

    // ✅ Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("doctor_photos")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert("Image upload failed: " + uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("doctor_photos")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // ✅ Update doctor record
    const { error: updateError } = await supabase
      .from("doctors")
      .update({ photo_url: publicUrl })
      .eq("user_id", user.id);

    if (updateError) {
      alert("Error saving image info: " + updateError.message);
    } else {
      alert("Doctor image uploaded successfully!");
    }
  });
}

// =========================
// PATIENT HISTORY LOADER
// =========================
async function loadPatients(doctorLicense) {
  const container = document.getElementById("patientsList");
  container.innerHTML = `<p class="text-gray-400">Loading patients...</p>`;

  // ✅ Fetch patients by doctor license
  const { data, error } = await supabase
    .from("patients")
    .select("id, name, age, blood_group, sex, created_at, doctor_license_no, phone")
    .eq("doctor_license_no", doctorLicense)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    container.innerHTML = `<p class="text-red-500">Error fetching patients.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<p class="text-gray-500">No patients found.</p>`;
    return;
  }

  // ✅ Create search bar above patient list
  const searchBar = document.createElement("input");
  searchBar.type = "text";
  searchBar.placeholder = "🔍 Search patients by name or blood group...";
  searchBar.className =
    "w-full mb-4 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-ink/40 focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-800 dark:text-gray-200";
  container.before(searchBar);

  // ✅ Render patient cards
  function renderPatients(filteredData) {
    container.innerHTML = "";
    filteredData.forEach((p, index) => {
      const card = document.createElement("div");
      card.className =
        "border border-red-200 dark:border-white/10 rounded-lg py-3 px-4 bg-white/60 dark:bg-ink/40 hover:bg-red-50 dark:hover:bg-ink/70 transition cursor-pointer";
      card.innerHTML = `
        <div class="flex justify-between items-center">
          <div>
            <span class="font-medium text-red-600 dark:text-red-400">${index + 1}. ${p.name}</span><br/>
            <span class="text-sm text-gray-600 dark:text-gray-300">${p.age} yrs • ${p.sex} • ${p.blood_group}</span>
          </div>
          <span class="text-xs text-gray-400">${new Date(p.created_at).toLocaleString()}</span>
        </div>
      `;

      // ✅ On click, open detection page
      card.addEventListener("click", () => {
        localStorage.setItem("selectedPatient", JSON.stringify(p));
        window.location.href = "detection.html";
      });

      container.appendChild(card);
    });
  }

  // ✅ Initial load
  renderPatients(data);

  // ✅ Filter results as user types
  searchBar.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = data.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.blood_group.toLowerCase().includes(term)
    );
    renderPatients(filtered);
  });
}

// =========================
// LOGOUT HANDLER (Strict)
// =========================
window.logoutDoctor = async function () {
  await supabase.auth.signOut();
  localStorage.clear();
  window.location.href = "login.html";
};
