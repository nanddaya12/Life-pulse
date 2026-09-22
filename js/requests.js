import { db, collection, addDoc, serverTimestamp, query, where, getDocs } from "./firebase-config.js";
import { showToast } from "./toast.js";

document.addEventListener("DOMContentLoaded", () => {
  const requestForm = document.getElementById("emergency-request-form");
  if (requestForm) {
    requestForm.addEventListener("submit", handleEmergencyRequestSubmit);
  }
});

function isValidPhoneNumber(phone) {
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone.trim());
}

async function handleEmergencyRequestSubmit(e) {
  e.preventDefault();

  const patientNameInput = document.getElementById("req-patient-name");
  const hospitalNameInput = document.getElementById("req-hospital-name");
  const bloodGroupInput = document.getElementById("req-blood-group");
  const unitsNeededInput = document.getElementById("req-units");
  const cityInput = document.getElementById("req-city");
  const urgencyInput = document.getElementById("req-urgency");
  const contactPhoneInput = document.getElementById("req-contact-phone");

  const patientName = patientNameInput ? patientNameInput.value.trim() : "";
  const hospitalName = hospitalNameInput ? hospitalNameInput.value.trim() : "";
  const bloodGroup = bloodGroupInput ? bloodGroupInput.value : "";
  const unitsNeeded = unitsNeededInput ? parseInt(unitsNeededInput.value, 10) : 1;
  const city = cityInput ? cityInput.value.trim() : "";
  const urgency = urgencyInput ? urgencyInput.value : "Critical";
  const contactNumber = contactPhoneInput ? contactPhoneInput.value.trim() : "";

  if (!patientName) {
    showToast("Please enter patient name or ID.", "warning");
    if (patientNameInput) patientNameInput.focus();
    return;
  }

  if (!hospitalName) {
    showToast("Please enter hospital name and location.", "warning");
    if (hospitalNameInput) hospitalNameInput.focus();
    return;
  }

  if (!bloodGroup) {
    showToast("Please select required blood group.", "warning");
    if (bloodGroupInput) bloodGroupInput.focus();
    return;
  }

  if (isNaN(unitsNeeded) || unitsNeeded < 1) {
    showToast("Please specify at least 1 unit required.", "warning");
    if (unitsNeededInput) unitsNeededInput.focus();
    return;
  }

  if (!city) {
    showToast("Please enter city/area location.", "warning");
    if (cityInput) cityInput.focus();
    return;
  }

  if (!isValidPhoneNumber(contactNumber)) {
    showToast("Please provide a valid emergency contact phone number.", "warning");
    if (contactPhoneInput) contactPhoneInput.focus();
    return;
  }

  const submitBtn = e.target.querySelector("button[type='submit']");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Broadcasting Emergency Alert...";
  }

  try {
    const requestData = {
      patientName: patientName,
      hospitalName: hospitalName,
      bloodGroup: bloodGroup,
      unitsNeeded: unitsNeeded,
      city: city.toLowerCase(),
      displayCity: city,
      urgency: urgency,
      contactNumber: contactNumber,
      status: "active",
      createdAt: serverTimestamp()
    };

    if (db) {
      const docRef = await addDoc(collection(db, "requests"), requestData);
      console.log("Emergency request created with ID:", docRef.id);
      
      const matchingCount = await matchAvailableDonors(bloodGroup, city.toLowerCase());
      showToast(`Emergency alert broadcasted! Found ${matchingCount} matching available donors in ${city}.`, "success", 6000);
    } else {
      showToast("Emergency request created! (Demo Mode)", "success");
    }

    requestForm.reset();

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1500);

  } catch (error) {
    console.error("Error submitting request:", error);
    showToast("Failed to publish emergency request: " + error.message, "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Post Emergency Blood Request";
    }
  }
}

export async function matchAvailableDonors(bloodGroup, city) {
  if (!db) return 0;

  try {
    const donorsRef = collection(db, "donors");
    const q = query(
      donorsRef,
      where("bloodGroup", "==", bloodGroup),
      where("city", "==", city.toLowerCase()),
      where("available", "==", true)
    );

    const querySnapshot = await getDocs(q);
    const count = querySnapshot.size;
    console.log(`Matched ${count} available donors for ${bloodGroup} in ${city}`);
    return count;
  } catch (e) {
    console.warn("Donor matching query note:", e.message);
    return 0;
  }
}
