import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://fdiroazxrgqlqmcnxeea.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkaXJvYXp4cmdxbHFtY254ZWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MzI4ODksImV4cCI6MjA3NzMwODg4OX0.Sm_ALvUtLHyOf41eYQaTxFiAjYelts29DjsB91tBjWo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Form Elements
const form = document.getElementById("patientForm");
const saveBtn = document.getElementById("saveBtn");
const detectionSection = document.getElementById("detectionSection");

const doctorLicenceInput = document.getElementById("doctorLicence");

let doctorId = null;
let doctorLicense = null;

// Fetch current doctor’s details
async function fetchDoctorData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert("No doctor logged in.");
    return;
  }

  const { data, error } = await supabase
    .from("doctors")
    .select("id, license_no")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching doctor:", error);
    alert("Unable to fetch doctor info.");
  } else {
    doctorId = data.id;
    doctorLicense = data.license_no;
    doctorLicenceInput.value = data.license_no;
  }
}

fetchDoctorData();

// Form Submit Handler
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  const patientData = {
    doctor_id: doctorId,
    doctor_license_no: doctorLicense,
    name: document.getElementById("name").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    age: parseInt(document.getElementById("age").value),
    blood_group: document.getElementById("bloodGroup").value,
    sex: document.getElementById("sex").value,
  };

  const { error } = await supabase.from("patients").insert([patientData]);

  if (error) {
    console.error("Error inserting patient:", error);
    alert("Failed to save patient. Check console for details.");
  } else {
    alert("Patient added successfully!");
    detectionSection.classList.remove("hidden");
    form.reset();
    doctorLicenceInput.value = doctorLicense;
  }

  saveBtn.disabled = false;
  saveBtn.textContent = "Save";
});
