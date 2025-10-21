const API_BASE = "https://counselor-scheduler-123-bjayctaaejfccyas.centralindia-01.azurewebsites.net";

let currentStudent = null;
let currentCounselor = null;

function hideAllSections() {
  document.getElementById("role-select").classList.add("hidden");
  document.getElementById("student-auth").classList.add("hidden");
  document.getElementById("student-dash").classList.add("hidden");
  document.getElementById("counselor-auth").classList.add("hidden");
  document.getElementById("counselor-dash").classList.add("hidden");
}

function chooseRole(role) {
  hideAllSections();
  if (role === "student") {
    document.getElementById("student-auth").classList.remove("hidden");
    switchStudentTab("login");
  } else {
    document.getElementById("counselor-auth").classList.remove("hidden");
    switchCounselorTab("login");
  }
}

function switchStudentTab(tab) {
  document.getElementById("student-login-form").classList.toggle("hidden", tab !== "login");
  document.getElementById("student-signup-form").classList.toggle("hidden", tab !== "signup");
  document.getElementById("student-login-tab").classList.toggle("active", tab === "login");
  document.getElementById("student-signup-tab").classList.toggle("active", tab === "signup");
  document.getElementById("student-auth-msg").textContent = "";
}

function switchCounselorTab(tab) {
  document.getElementById("counselor-login-form").classList.toggle("hidden", tab !== "login");
  document.getElementById("counselor-signup-form").classList.toggle("hidden", tab !== "signup");
  document.getElementById("counselor-login-tab").classList.toggle("active", tab === "login");
  document.getElementById("counselor-signup-tab").classList.toggle("active", tab === "signup");
  document.getElementById("counselor-auth-msg").textContent = "";
}

async function registerStudent(name, email, password) {
  const res = await fetch(`${API_BASE}/api/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg);
  }
  alert("Student registration successful. Please login.");
}

async function loginStudent(email, password) {
  // For demo, we fetch students and do client-side check (replace with real auth later)
  const res = await fetch(`${API_BASE}/api/students`);
  if (!res.ok) throw new Error("Failed to fetch students.");
  const students = await res.json();
  const user = students.find((u) => u.Email === email);
  if (!user) throw new Error("Student not found.");
  currentStudent = user;
  document.getElementById("student-name").textContent = currentStudent.Name;
  showStudentDashboard();
}

async function registerCounselor(data) {
  const res = await fetch(`${API_BASE}/api/counselors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg);
  }
  alert("Counselor registration successful. Please login.");
}

async function loginCounselor(email, password) {
  const res = await fetch(`${API_BASE}/api/counselors`);
  if (!res.ok) throw new Error("Failed to fetch counselors.");
  const counselors = await res.json();
  const user = counselors.find((u) => u.Email === email);
  if (!user) throw new Error("Counselor not found.");
  currentCounselor = user;
  document.getElementById("counselor-name").textContent = currentCounselor.Name;
  showCounselorDashboard();
}

function showStudentDashboard() {
  hideAllSections();
  document.getElementById("student-dash").classList.remove("hidden");
  loadCounselorTypes();
  loadStudentAppointments();
}

function showCounselorDashboard() {
  hideAllSections();
  document.getElementById("counselor-dash").classList.remove("hidden");
  loadCounselorProfile();
  loadCounselorAppointments();
}

function logout() {
  currentStudent = null;
  currentCounselor = null;
  hideAllSections();
  document.getElementById("role-select").classList.remove("hidden");
}

// Load counselor types on booking form
function loadCounselorTypes() {
  // static types, or could query backend if dynamic
  const select = document.getElementById("booking-counselor-type");
  select.innerHTML = `<option value="">Select Counselor Type</option>
    <option value="Academic">Academic</option>
    <option value="Mental Health">Mental Health</option>`;
  select.onchange = loadCounselors;
}

// Load counselors filtered by type
async function loadCounselors() {
  const type = document.getElementById("booking-counselor-type").value;
  const select = document.getElementById("booking-counselor-name");
  select.innerHTML = "<option value=''>Select Counselor</option>";
  if (!type) return;
  const res = await fetch(`${API_BASE}/api/counselors`);
  if (!res.ok) return alert("Failed to load counselors.");
  const counselors = await res.json();
  counselors.filter(c => c.CounselorType === type)
    .forEach(c => {
      const option = document.createElement("option");
      option.value = c.CounselorID;
      option.textContent = c.Name;
      select.appendChild(option);
    });
}

// Book appointment form handler
document.getElementById("student-booking-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const counselorID = document.getElementById("booking-counselor-name").value;
  const date = document.getElementById("student-date").value;
  const time = document.getElementById("student-time").value;
  if (!counselorID || !date || !time) {
    alert("Please fill all booking fields.");
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentID: currentStudent.StudentID,
        counselorID: parseInt(counselorID),
        date,
        time
      })
    });
    if (res.status === 409) {
      alert("This counselor is already booked at that time.");
      return;
    }
    if (!res.ok) throw new Error("Failed to book appointment");
    alert("Appointment booked successfully.");
    loadStudentAppointments();
  } catch (err) {
    alert(err.message);
  }
});

// Load current student appointments
async function loadStudentAppointments() {
  const tbody = document.querySelector("#student-appointments-table tbody");
  tbody.innerHTML = "";
  const res = await fetch(`${API_BASE}/api/appointments/student/${currentStudent.StudentID}`);
  if (!res.ok) {
    tbody.innerHTML = "<tr><td colspan='5'>Failed to load appointments</td></tr>";
    return;
  }
  const appts = await res.json();
  appts.forEach(app => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${app.CounselorName}</td><td>${app.CounselorType}</td><td>${app.Date}</td><td>${app.Time}</td><td>${app.Status}</td>`;
    tbody.appendChild(tr);
  });
}

// Load counselor profile
function loadCounselorProfile() {
  if (!currentCounselor) return;
  document.getElementById("counselor-photo-display").src = currentCounselor.Photo || "https://via.placeholder.com/96?text=No+Photo";
  document.getElementById("counselor-bio-display").textContent = currentCounselor.Bio || "No bio available.";
}

// Load counselor appointments — for demo, this can be left for further enhancement
function loadCounselorAppointments() {
  // Would query backend API for counselor's appointments by counselorID
  // populate #counselor-appointments-table tbody
}

// Student login form submit
document.getElementById("student-login-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const email = document.getElementById("student-login-email").value;
    const password = document.getElementById("student-login-password").value; // placeholder, ignored in demo
    await loginStudent(email, password);
  } catch (err) {
    document.getElementById("student-auth-msg").textContent = err.message;
  }
});

// Student signup form submit
document.getElementById("student-signup-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const name = document.getElementById("student-signup-name").value;
    const email = document.getElementById("student-signup-email").value;
    const password = document.getElementById("student-signup-password").value;
    await registerStudent(name, email, password);
    switchStudentTab("login");
  } catch (err) {
    document.getElementById("student-auth-msg").textContent = err.message;
  }
});

// Counselor login form submit
document.getElementById("counselor-login-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const email = document.getElementById("counselor-login-email").value;
    const password = document.getElementById("counselor-login-password").value;
    await loginCounselor(email, password);
  } catch (err) {
    document.getElementById("counselor-auth-msg").textContent = err.message;
  }
});

// Counselor signup form submit
document.getElementById("counselor-signup-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const name = document.getElementById("counselor-signup-name").value;
    const email = document.getElementById("counselor-signup-email").value;
    const password = document.getElementById("counselor-signup-password").value;
    const counselorType = document.getElementById("counselor-signup-type").value;
    const bio = document.getElementById("counselor-bio").value;
    const photoInput = document.getElementById("counselor-photo");
    let photo = "";
    if (photoInput.files.length > 0) {
      photo = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.onerror = () => rej();
        reader.readAsDataURL(photoInput.files[0]);
      });
    }
    await registerCounselor({ name, email, password, counselorType, bio, photo });
    switchCounselorTab("login");
  } catch (err) {
    document.getElementById("counselor-auth-msg").textContent = err.message;
  }
});
