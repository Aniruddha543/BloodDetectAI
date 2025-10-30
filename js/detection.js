const uploadInput = document.getElementById('imageUpload');
const originalImage = document.getElementById('originalImage');
const detectedImage = document.getElementById('detectedImage');
const detectBtn = document.getElementById('detectBtn');
const reportBtn = document.getElementById('reportBtn');

let uploadedFile = null;

// ✅ Load selected patient data from localStorage
const patientData = JSON.parse(localStorage.getItem('selectedPatient'));

uploadInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    uploadedFile = file;
    originalImage.src = URL.createObjectURL(file);
    detectedImage.src = "";
  }
});

detectBtn.addEventListener('click', async () => {
  if (!uploadedFile) {
    alert("⚠️ Please upload an image first!");
    return;
  }

  if (!patientData || !patientData.name || !patientData.doctor_license_no) {
    alert("⚠️ Missing patient or doctor information!");
    return;
  }

  const formData = new FormData();
  formData.append("file", uploadedFile);
  formData.append("patient_name", patientData.name);
  formData.append("doctor_license_no", patientData.doctor_license_no);

  try {
    const baseURL = window.location.origin; // works locally & on Render
    const response = await fetch(`${baseURL}/detect`, {
      method: "POST",
      body: formData,
    });


    if (!response.ok) throw new Error("Detection request failed.");

    const result = await response.json();
    console.log("✅ Detection Result:", result);

    if (result.image_url) {
      detectedImage.src = `${baseURL}${result.image_url}?t=${Date.now()}`;

      // Optional — show counts in alert or toast
      alert(`✅ Detection complete!
RBC: ${result.rbc_count}
WBC: ${result.wbc_count}
Platelet: ${result.platelet_count}`);
    } else {
      alert("❌ Detection failed. Please try again.");
    }
  } catch (error) {
    console.error("🚨 Error during detection:", error);
    alert("🚨 Error connecting to detection server!");
  }
});

reportBtn.addEventListener('click', () => {
  window.location.href = "report.html";
});
