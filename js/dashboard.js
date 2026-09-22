import { db, collection, query, where, orderBy, onSnapshot, updateDoc, doc } from "./firebase-config.js";
import { showToast } from "./toast.js";

let activeRequests = [];
let unsubscribeListener = null;

document.addEventListener("DOMContentLoaded", () => {
  initDashboard();
});

function initDashboard() {
  setupFilterListeners();
  listenToRealtimeRequests();
}

function listenToRealtimeRequests() {
  const container = document.getElementById("requests-feed-container");
  if (!container) return;

  if (!db) {
    console.warn("Firebase Firestore DB not configured. Showing sample emergency requests demo.");
    renderDemoRequests();
    return;
  }

  try {
    const requestsRef = collection(db, "requests");
    const q = query(requestsRef, where("status", "==", "active"));

    unsubscribeListener = onSnapshot(q, (snapshot) => {
      const requests = [];
      let isInitialLoad = activeRequests.length === 0;

      snapshot.forEach((docSnap) => {
        requests.push({ id: docSnap.id, ...docSnap.data() });
      });

      requests.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : Date.now();
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : Date.now();
        return timeB - timeA;
      });

      if (!isInitialLoad && requests.length > activeRequests.length) {
        const newReq = requests[0];
        checkAndNotifyMatchingDonor(newReq);
      }

      activeRequests = requests;
      renderRequestsFeed(activeRequests);
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
      renderDemoRequests();
    });

  } catch (e) {
    console.error("Error setting up real-time listener:", e);
    renderDemoRequests();
  }
}

function checkAndNotifyMatchingDonor(req) {
  const donorBloodGroup = localStorage.getItem("donorBloodGroup");
  const donorCity = localStorage.getItem("donorCity");

  if (donorBloodGroup && donorCity) {
    const isBloodMatch = req.bloodGroup === donorBloodGroup;
    const isCityMatch = req.city && req.city.toLowerCase() === donorCity.toLowerCase();

    if (isBloodMatch && isCityMatch) {
      showToast(
        `🚨 URGENT MATCH: ${req.unitsNeeded} units of ${req.bloodGroup} needed at ${req.hospitalName}, ${req.displayCity || req.city}!`,
        "error",
        8000
      );
    }
  }
}

function renderRequestsFeed(requestsList) {
  const container = document.getElementById("requests-feed-container");
  const activeCountEl = document.getElementById("active-requests-count");

  if (!container) return;

  if (activeCountEl) {
    activeCountEl.textContent = requestsList.length;
  }

  if (requestsList.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="empty-state-card py-5">
          <div class="empty-state-icon-box mx-auto">
            <i class="bi bi-droplet"></i>
          </div>
          <h3 class="fw-bold text-dark h4 mb-2">No Active Emergency Requests</h3>
          <p class="text-muted mb-0">There are currently no active emergency blood requests. Check back soon!</p>
        </div>
      </div>
    `;
    return;
  }

  const donorBloodGroup = localStorage.getItem("donorBloodGroup");
  const donorCity = localStorage.getItem("donorCity");

  let html = "";
  requestsList.forEach((req) => {
    const isMatched = donorBloodGroup && donorCity &&
      req.bloodGroup === donorBloodGroup &&
      (req.city && req.city.toLowerCase() === donorCity.toLowerCase());

    const urgencyClass = req.urgency === "Critical" ? "badge-urgency-critical" :
                         req.urgency === "High" ? "badge-urgency-high" : "badge-urgency-normal";

    const formattedTime = req.createdAt?.toDate ? 
      req.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now";

    html += `
      <div class="col">
        <div class="request-card-modern ${isMatched ? 'matched-highlight' : ''}" data-id="${req.id}" data-urgency="${req.urgency}" data-blood="${req.bloodGroup}">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h4 class="h5 fw-bold text-dark mb-1">${escapeHtml(req.hospitalName)}</h4>
              <div class="text-muted small"><i class="bi bi-geo-alt-fill text-danger me-1"></i> ${escapeHtml(req.displayCity || req.city)}</div>
            </div>
            <span class="${urgencyClass}">${req.urgency || 'Critical'}</span>
          </div>

          ${isMatched ? `<div class="badge-match-highlight mb-3 d-inline-flex align-items-center"><i class="bi bi-star-fill me-1"></i> MATCHES YOUR DONOR PROFILE</div>` : ''}

          <div class="bg-light p-3 rounded-3 mb-3 border">
            <div class="d-flex justify-content-between text-muted small mb-2">
              <span>Patient / ID:</span>
              <span class="fw-bold text-dark">${escapeHtml(req.patientName)}</span>
            </div>
            <div class="d-flex justify-content-between text-muted small mb-2 align-items-center">
              <span>Blood Group Needed:</span>
              <span class="badge-blood-group">${req.bloodGroup}</span>
            </div>
            <div class="d-flex justify-content-between text-muted small mb-2">
              <span>Units Needed:</span>
              <span class="fw-bold text-danger fs-6">${req.unitsNeeded} Unit(s)</span>
            </div>
            <div class="d-flex justify-content-between text-muted small">
              <span>Time Posted:</span>
              <span class="fw-medium text-secondary"><i class="bi bi-clock me-1"></i> ${formattedTime}</span>
            </div>
          </div>

          <div class="d-flex align-items-center justify-content-between gap-2 mt-auto pt-2">
            <button class="btn btn-crimson btn-sm rounded-pill w-100 btn-respond" data-phone="${escapeHtml(req.contactNumber)}" data-id="${req.id}">
              <i class="bi bi-suit-heart-fill me-1"></i> I Can Donate
            </button>
            <a href="tel:${escapeHtml(req.contactNumber)}" class="btn btn-outline-secondary btn-sm rounded-pill px-3 text-nowrap" title="Call Emergency Contact">
              <i class="bi bi-telephone-fill"></i>
            </a>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  document.querySelectorAll(".btn-respond").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const phone = e.currentTarget.getAttribute("data-phone");
      const reqId = e.currentTarget.getAttribute("data-id");
      handleDonorResponse(reqId, phone);
    });
  });
}

async function handleDonorResponse(reqId, phone) {
  showToast(`Thank you for offering to donate! Contact number for emergency: ${phone}`, "success", 7000);
  
  if (confirm(`Would you like to dial emergency contact number (${phone}) right now?`)) {
    window.location.href = `tel:${phone}`;
  }
}

function setupFilterListeners() {
  const filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      filterBtns.forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");

      const filterType = e.target.getAttribute("data-filter");
      applyFilter(filterType);
    });
  });
}

function applyFilter(filterType) {
  const donorBloodGroup = localStorage.getItem("donorBloodGroup");
  const donorCity = localStorage.getItem("donorCity");

  if (filterType === "all") {
    renderRequestsFeed(activeRequests);
  } else if (filterType === "matched") {
    if (!donorBloodGroup || !donorCity) {
      showToast("Please register as a donor first to view personalized matches!", "info");
      renderRequestsFeed(activeRequests);
      return;
    }
    const filtered = activeRequests.filter(req => 
      req.bloodGroup === donorBloodGroup && 
      (req.city && req.city.toLowerCase() === donorCity.toLowerCase())
    );
    renderRequestsFeed(filtered);
  } else if (filterType === "critical") {
    const filtered = activeRequests.filter(req => req.urgency === "Critical");
    renderRequestsFeed(filtered);
  }
}

function renderDemoRequests() {
  const demoData = [
    {
      id: "demo1",
      hospitalName: "City General Hospital",
      patientName: "Emergency ICU Room 4",
      bloodGroup: "O-",
      unitsNeeded: 3,
      city: "new york",
      displayCity: "New York",
      urgency: "Critical",
      contactNumber: "+15550192834",
      status: "active"
    },
    {
      id: "demo2",
      hospitalName: "St. Jude Medical Center",
      patientName: "Surgical Unit B",
      bloodGroup: "A+",
      unitsNeeded: 2,
      city: "chicago",
      displayCity: "Chicago",
      urgency: "High",
      contactNumber: "+15550192835",
      status: "active"
    },
    {
      id: "demo3",
      hospitalName: "Metro Healthcare Clinic",
      patientName: "Trauma Ward 12",
      bloodGroup: "AB-",
      unitsNeeded: 1,
      city: "los angeles",
      displayCity: "Los Angeles",
      urgency: "Critical",
      contactNumber: "+15550192836",
      status: "active"
    }
  ];

  activeRequests = demoData;
  renderRequestsFeed(demoData);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
