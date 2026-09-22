import { db, collection, addDoc, serverTimestamp, auth } from "./firebase-config.js";
import { showToast } from "./toast.js";

document.addEventListener("DOMContentLoaded", () => {
  const registerDonorForm = document.getElementById("register-donor-form");
  if (registerDonorForm) {
    registerDonorForm.addEventListener("submit", handleDonorRegistration);
  }
});

function isValidPhoneNumber(phone) {
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone.trim());
}

async function handleDonorRegistration(e) {
  e.preventDefault();

  const nameInput = document.getElementById("donor-name");
  const phoneInput = document.getElementById("donor-phone");
  const bloodGroupInput = document.getElementById("donor-blood-group");
  const cityInput = document.getElementById("donor-city");
  const availableInput = document.getElementById("donor-available");
  const lastDonationInput = document.getElementById("donor-last-donation");

  const name = nameInput ? nameInput.value.trim() : "";
  const phone = phoneInput ? phoneInput.value.trim() : "";
  const bloodGroup = bloodGroupInput ? bloodGroupInput.value : "";
  const city = cityInput ? cityInput.value.trim() : "";
  const available = availableInput ? availableInput.checked : true;
  const lastDonationDate = lastDonationInput ? lastDonationInput.value : "Not specified";

  if (!name || name.length < 2) {
    showToast("Please enter a valid full name.", "warning");
    if (nameInput) nameInput.focus();
    return;
  }

  if (!isValidPhoneNumber(phone)) {
    showToast("Please enter a valid phone number (e.g. +1234567890 or 10 digits).", "warning");
    if (phoneInput) phoneInput.focus();
    return;
  }

  if (!bloodGroup) {
    showToast("Please select a blood group from the dropdown.", "warning");
    if (bloodGroupInput) bloodGroupInput.focus();
    return;
  }

  if (!city) {
    showToast("Please enter your city/area location.", "warning");
    if (cityInput) cityInput.focus();
    return;
  }

  const submitBtn = e.target.querySelector("button[type='submit']");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Registering Donor...";
  }

  try {
    const currentUserId = auth && auth.currentUser ? auth.currentUser.uid : null;

    const donorData = {
      name: name,
      phone: phone,
      bloodGroup: bloodGroup,
      city: city.toLowerCase(),
      displayCity: city,
      available: Boolean(available),
      lastDonationDate: lastDonationDate,
      createdAt: serverTimestamp(),
      uid: currentUserId
    };

    if (db) {
      await addDoc(collection(db, "donors"), donorData);
    } else {
      console.log("Mock Firestore addDoc (No active DB config):", donorData);
    }

    showToast("Thank you! You are now registered as an active blood donor on LifePulse.", "success", 5000);

    localStorage.setItem("donorBloodGroup", bloodGroup);
    localStorage.setItem("donorCity", city.toLowerCase());
    localStorage.setItem("isDonorRegistered", "true");

    registerDonorForm.reset();

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1500);

  } catch (error) {
    console.error("Error adding donor record:", error);
    showToast("Failed to submit donor registration: " + error.message, "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Register as Donor";
    }
  }
}
