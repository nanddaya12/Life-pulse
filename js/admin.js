import { db, collection, getDocs, updateDoc, doc } from "./firebase-config.js";
import { showToast } from "./toast.js";

document.addEventListener("DOMContentLoaded", () => {
  initAdminDashboard();
});

async function initAdminDashboard() {
  loadAdminDonors();
  loadAdminRequests();
}

async function loadAdminDonors() {
  const tbody = document.getElementById("admin-donors-tbody");
  const countEl = document.getElementById("admin-donors-count");
  if (!tbody) return;

  if (!db) {
    renderDemoDonorsTable(tbody, countEl);
    return;
  }

  try {
    const donorsSnap = await getDocs(collection(db, "donors"));
    const donors = [];
    donorsSnap.forEach(docSnap => {
      donors.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (countEl) countEl.textContent = donors.length;

    if (donors.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No donors registered yet.</td></tr>`;
      return;
    }

    let html = "";
    donors.forEach(donor => {
      html += `
        <tr>
          <td><strong class="text-dark">${escapeHtml(donor.name)}</strong></td>
          <td><span class="badge-blood-group">${donor.bloodGroup}</span></td>
          <td><i class="bi bi-geo-alt-fill text-danger me-1"></i> ${escapeHtml(donor.displayCity || donor.city)}</td>
          <td><i class="bi bi-telephone me-1 text-muted"></i> ${escapeHtml(donor.phone)}</td>
          <td>
            <span class="${donor.available ? 'badge-urgency-normal' : 'badge-urgency-high'}">
              ${donor.available ? 'Available' : 'Unavailable'}
            </span>
          </td>
          <td class="text-end">
            <button class="btn btn-outline-crimson btn-sm rounded-pill px-3 toggle-donor-btn" data-id="${donor.id}" data-status="${donor.available}">
              Toggle Status
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    tbody.querySelectorAll(".toggle-donor-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const donorId = e.currentTarget.getAttribute("data-id");
        const currentStatus = e.currentTarget.getAttribute("data-status") === "true";
        await toggleDonorAvailability(donorId, !currentStatus);
      });
    });

  } catch (error) {
    console.error("Error loading donors for admin:", error);
    renderDemoDonorsTable(tbody, countEl);
  }
}

async function toggleDonorAvailability(donorId, newStatus) {
  if (!db) {
    showToast("Donor availability status toggled (Demo Mode)", "success");
    return;
  }

  try {
    await updateDoc(doc(db, "donors", donorId), { available: newStatus });
    showToast("Donor status updated successfully!", "success");
    loadAdminDonors();
  } catch (error) {
    showToast("Failed to update status: " + error.message, "error");
  }
}

async function loadAdminRequests() {
  const tbody = document.getElementById("admin-requests-tbody");
  const countEl = document.getElementById("admin-requests-count");
  if (!tbody) return;

  if (!db) {
    renderDemoRequestsTable(tbody, countEl);
    return;
  }

  try {
    const requestsSnap = await getDocs(collection(db, "requests"));
    const requests = [];
    requestsSnap.forEach(docSnap => {
      requests.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (countEl) countEl.textContent = requests.length;

    if (requests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No emergency requests posted yet.</td></tr>`;
      return;
    }

    let html = "";
    requests.forEach(req => {
      const isFulfilled = req.status === "fulfilled";
      const urgencyClass = req.urgency === 'Critical' ? 'badge-urgency-critical' : 'badge-urgency-high';

      html += `
        <tr>
          <td><strong class="text-dark">${escapeHtml(req.hospitalName)}</strong></td>
          <td>${escapeHtml(req.patientName)}</td>
          <td><span class="badge-blood-group me-1">${req.bloodGroup}</span> <span class="text-muted small">(${req.unitsNeeded} units)</span></td>
          <td><i class="bi bi-geo-alt-fill text-danger me-1"></i> ${escapeHtml(req.displayCity || req.city)}</td>
          <td>
            <span class="${urgencyClass}">
              ${req.urgency}
            </span>
          </td>
          <td>
            <span class="badge ${isFulfilled ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'} rounded-pill px-3 py-1 fw-bold">
              ${req.status.toUpperCase()}
            </span>
          </td>
          <td class="text-end">
            <button class="btn btn-crimson btn-sm rounded-pill px-3 fulfill-req-btn" data-id="${req.id}" data-status="${req.status}">
              ${isFulfilled ? 'Reopen Request' : 'Mark Fulfilled'}
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    tbody.querySelectorAll(".fulfill-req-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const reqId = e.currentTarget.getAttribute("data-id");
        const currentStatus = e.currentTarget.getAttribute("data-status");
        const newStatus = currentStatus === "fulfilled" ? "active" : "fulfilled";
        await updateRequestStatus(reqId, newStatus);
      });
    });

  } catch (error) {
    console.error("Error loading requests for admin:", error);
    renderDemoRequestsTable(tbody, countEl);
  }
}

async function updateRequestStatus(reqId, newStatus) {
  if (!db) {
    showToast(`Request status updated to ${newStatus} (Demo Mode)`, "success");
    return;
  }

  try {
    await updateDoc(doc(db, "requests", reqId), { status: newStatus });
    showToast(`Request status updated to ${newStatus}!`, "success");
    loadAdminRequests();
  } catch (error) {
    showToast("Failed to update request: " + error.message, "error");
  }
}

function renderDemoDonorsTable(tbody, countEl) {
  if (countEl) countEl.textContent = "3";
  tbody.innerHTML = `
    <tr>
      <td><strong class="text-dark">Sarah Jenkins</strong></td>
      <td><span class="badge-blood-group">O-</span></td>
      <td><i class="bi bi-geo-alt-fill text-danger me-1"></i> New York</td>
      <td><i class="bi bi-telephone me-1 text-muted"></i> +1 555-0192</td>
      <td><span class="badge-urgency-normal">Available</span></td>
      <td class="text-end"><button class="btn btn-outline-crimson btn-sm rounded-pill px-3">Toggle Status</button></td>
    </tr>
    <tr>
      <td><strong class="text-dark">Michael Chang</strong></td>
      <td><span class="badge-blood-group">A+</span></td>
      <td><i class="bi bi-geo-alt-fill text-danger me-1"></i> Chicago</td>
      <td><i class="bi bi-telephone me-1 text-muted"></i> +1 555-0193</td>
      <td><span class="badge-urgency-normal">Available</span></td>
      <td class="text-end"><button class="btn btn-outline-crimson btn-sm rounded-pill px-3">Toggle Status</button></td>
    </tr>
    <tr>
      <td><strong class="text-dark">David Ross</strong></td>
      <td><span class="badge-blood-group">AB-</span></td>
      <td><i class="bi bi-geo-alt-fill text-danger me-1"></i> Los Angeles</td>
      <td><i class="bi bi-telephone me-1 text-muted"></i> +1 555-0194</td>
      <td><span class="badge-urgency-high">Unavailable</span></td>
      <td class="text-end"><button class="btn btn-outline-crimson btn-sm rounded-pill px-3">Toggle Status</button></td>
    </tr>
  `;
}

function renderDemoRequestsTable(tbody, countEl) {
  if (countEl) countEl.textContent = "2";
  tbody.innerHTML = `
    <tr>
      <td><strong class="text-dark">City General Hospital</strong></td>
      <td>ICU Ward 4</td>
      <td><span class="badge-blood-group me-1">O-</span> <span class="text-muted small">(3 units)</span></td>
      <td><i class="bi bi-geo-alt-fill text-danger me-1"></i> New York</td>
      <td><span class="badge-urgency-critical">Critical</span></td>
      <td><span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-3 py-1 fw-bold">ACTIVE</span></td>
      <td class="text-end"><button class="btn btn-crimson btn-sm rounded-pill px-3">Mark Fulfilled</button></td>
    </tr>
    <tr>
      <td><strong class="text-dark">St. Jude Medical Center</strong></td>
      <td>Surgery B</td>
      <td><span class="badge-blood-group me-1">A+</span> <span class="text-muted small">(2 units)</span></td>
      <td><i class="bi bi-geo-alt-fill text-danger me-1"></i> Chicago</td>
      <td><span class="badge-urgency-high">High</span></td>
      <td><span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-3 py-1 fw-bold">ACTIVE</span></td>
      <td class="text-end"><button class="btn btn-crimson btn-sm rounded-pill px-3">Mark Fulfilled</button></td>
    </tr>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
