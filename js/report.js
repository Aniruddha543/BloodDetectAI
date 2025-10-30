// ✅ Supabase Setup
const SUPABASE_URL = "https://fdiroazxrgqlqmcnxeea.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkaXJvYXp4cmdxbHFtY254ZWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MzI4ODksImV4cCI6MjA3NzMwODg4OX0.Sm_ALvUtLHyOf41eYQaTxFiAjYelts29DjsB91tBjWo";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ✅ DOM Elements
const patientNameEl = document.getElementById("pname");
const patientPhoneEl = document.getElementById("pphone");
const patientAgeEl = document.getElementById("page");
const patientSexEl = document.getElementById("psex");
const doctorNameEl = document.getElementById("doctorName");
const doctorLicenseEl = document.getElementById("doctorLicense");
const reportDateEl = document.getElementById("reportDate");
const reportTableBody = document.querySelector("#reportTable tbody");
const docNameFooter = document.getElementById("docNameFooter");

// ✅ Load Report
(async function loadReport() {
  try {
    const patientId = localStorage.getItem("selected_patient_id");
    const doctorId = localStorage.getItem("logged_doctor_id");

    if (!patientId || !doctorId) {
      alert("⚠️ Missing patient or doctor session. Please return to dashboard.");
      return;
    }

    // ✅ Fetch doctor details
    const { data: doctorData, error: doctorError } = await supabaseClient
      .from("doctors")
      .select("first_name, last_name, license_no")
      .eq("id", doctorId)
      .single();

    if (doctorError || !doctorData) {
      console.error("Doctor Fetch Error:", doctorError);
      alert("⚠️ Could not fetch doctor info.");
      return;
    }

    const doctorFullName = `${doctorData.first_name} ${doctorData.last_name}`;
    doctorNameEl.textContent = doctorFullName;
    doctorLicenseEl.textContent = doctorData.license_no;
    docNameFooter.textContent = doctorFullName;

    // ✅ Fetch patient details
    const { data: patientData, error: patientError } = await supabaseClient
      .from("patients")
      .select("name, phone, age, sex, doctor_license_no")
      .eq("id", patientId)
      .single();

    if (patientError || !patientData) {
      console.error("Patient Fetch Error:", patientError);
      alert("⚠️ Could not fetch patient info.");
      return;
    }

    patientNameEl.textContent = patientData.name;
    patientPhoneEl.textContent = patientData.phone;
    patientAgeEl.textContent = patientData.age;
    patientSexEl.textContent = patientData.sex || "N/A";

    // ✅ Set date
    reportDateEl.textContent = new Date().toLocaleDateString();

    // ✅ Fetch detection results for this patient
    const { data: detectionData, error: detectionError } = await supabaseClient
      .from("detections")
      .select("date, time, rbc_count, wbc_count, platelet_count")
      .eq("patient_id", patientId)
      .order("date", { ascending: false });

    if (detectionError) {
      console.error("Detection Fetch Error:", detectionError);
      alert("⚠️ Failed to load detection data.");
      return;
    }

    // ✅ Populate table
    reportTableBody.innerHTML = "";
    if (!detectionData || detectionData.length === 0) {
      reportTableBody.innerHTML = `<tr><td colspan="5">No detection records found.</td></tr>`;
    } else {
      detectionData.forEach((d) => {
        reportTableBody.innerHTML += `
          <tr>
            <td>${d.date || "-"}</td>
            <td>${d.time || "-"}</td>
            <td>${d.rbc_count ?? "0"}</td>
            <td>${d.wbc_count ?? "0"}</td>
            <td>${d.platelet_count ?? "0"}</td>
          </tr>`;
      });
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    alert("❌ Something went wrong while loading the report.");
  }
})();

// ✅ PDF Download
function downloadPDF() {
  const reportElement = document.querySelector(".report-container");
  const opt = {
    margin: 0.5,
    filename: "Patient_Report.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
  };
  html2pdf().set(opt).from(reportElement).save();
}
