import { 
  auth, 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  serverTimestamp 
} from "./firebase-config.js";
import { showToast } from "./toast.js";

let currentUser = null;
let currentUserProfile = null;

document.addEventListener("DOMContentLoaded", () => {
  setupNavbarAuthUI();

  if (auth) {
    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            currentUserProfile = userSnap.data();
            localStorage.setItem("userRole", currentUserProfile.role || "Donor");
          }
        } catch (e) {
          console.warn("Could not fetch user profile from Firestore:", e.message);
        }
        updateNavbarState(true, user);
      } else {
        currentUserProfile = null;
        localStorage.removeItem("userRole");
        updateNavbarState(false);
      }
    });
  } else {
    updateNavbarState(false);
  }
});

function setupNavbarAuthUI() {
  const logoutBtn = document.getElementById("nav-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }
}

function updateNavbarState(isLoggedIn, user = null) {
  const authNavGuest = document.getElementById("nav-guest");
  const authNavUser = document.getElementById("nav-user");
  const userEmailDisplay = document.getElementById("nav-user-email");
  const adminNavLink = document.getElementById("nav-link-admin");

  const role = localStorage.getItem("userRole") || "Donor";

  if (isLoggedIn && user) {
    if (authNavGuest) authNavGuest.style.display = "none";
    if (authNavUser) authNavUser.style.display = "flex";
    if (userEmailDisplay) userEmailDisplay.textContent = `${user.email.split('@')[0]} (${role})`;
    
    if (adminNavLink) {
      adminNavLink.style.display = (role === "Hospital-Admin" || role === "Admin") ? "block" : "none";
    }
  } else {
    if (authNavGuest) authNavGuest.style.display = "flex";
    if (authNavUser) authNavUser.style.display = "none";
    if (adminNavLink) adminNavLink.style.display = "none";
  }
}

export async function registerUser(email, password, role = "Donor", additionalData = {}) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userProfile = {
      uid: user.uid,
      email: email,
      role: role,
      createdAt: serverTimestamp(),
      ...additionalData
    };

    await setDoc(doc(db, "users", user.uid), userProfile);
    localStorage.setItem("userRole", role);

    showToast(`Account created successfully as ${role}!`, "success");
    return { success: true, user: user, profile: userProfile };
  } catch (error) {
    showToast(error.message || "Registration failed.", "error");
    return { success: false, error: error.message };
  }
}

export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    let role = "Donor";
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) {
        role = userSnap.data().role || "Donor";
      }
    } catch (e) {
      console.warn("User profile check warning:", e.message);
    }

    localStorage.setItem("userRole", role);
    showToast("Signed in successfully!", "success");
    return { success: true, user: user, role: role };
  } catch (error) {
    showToast(error.message || "Invalid credentials.", "error");
    return { success: false, error: error.message };
  }
}

export async function handleLogout() {
  try {
    if (auth) {
      await signOut(auth);
    }
    localStorage.removeItem("userRole");
    showToast("Logged out successfully.", "info");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);
  } catch (error) {
    showToast("Failed to log out.", "error");
  }
}

export { currentUser, currentUserProfile };
