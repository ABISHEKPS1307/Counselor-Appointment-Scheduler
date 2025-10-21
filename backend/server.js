import express from "express";
import sql from "mssql";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

// CORS configuration: allow frontend URLs and local testing
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://your-frontend-name.azurestaticapps.net" // replace with your actual frontend URL
  ],
  methods: ["GET", "POST", "PATCH", "DELETE"],
}));

const dbConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DATABASE,
  server: process.env.SQL_SERVER,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  }
};

async function getPool() {
  try {
    return await sql.connect(dbConfig);
  } catch (error) {
    console.error("Failed to connect to Azure SQL:", error);
    throw error;
  }
}

// Yes route to confirm backend live
app.get("/", (req, res) => {
  res.send("✅ Azure Node.js backend running");
});

// STUDENTS

// Create student
app.post("/api/students", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, password)
      .query("INSERT INTO Students (Name, Email, Password) VALUES (@name, @email, @password)");
    res.status(201).send("Student registered successfully.");
  } catch (err) {
    console.error("Error creating student:", err);
    res.status(500).send("Database error.");
  }
});

// Get all students
app.get("/api/students", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT StudentID, Name, Email FROM Students");
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).send("Database error.");
  }
});

// COUNSELORS

// Create counselor
app.post("/api/counselors", async (req, res) => {
  const { name, email, password, counselorType, bio, photo } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, password)
      .input("counselorType", sql.NVarChar, counselorType)
      .input("bio", sql.NVarChar, bio || null)
      .input("photo", sql.NVarChar, photo || null)
      .query(`INSERT INTO Counselors (Name, Email, Password, CounselorType, Bio, Photo)
              VALUES (@name, @email, @password, @counselorType, @bio, @photo)`);
    res.status(201).send("Counselor added successfully.");
  } catch (err) {
    console.error("Error creating counselor:", err);
    res.status(500).send("Database error.");
  }
});

// Get all counselors
app.get("/api/counselors", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT CounselorID, Name, Email, CounselorType, Bio, Photo FROM Counselors");
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching counselors:", err);
    res.status(500).send("Database error.");
  }
});

// APPOINTMENTS

// Create appointment with conflict check
app.post("/api/appointments", async (req, res) => {
  const { studentID, counselorID, date, time } = req.body;
  try {
    const pool = await getPool();

    // Conflict check: existing pending/accepted appointment for same counselor/time
    const conflictResult = await pool.request()
      .input("counselorID", sql.Int, counselorID)
      .input("date", sql.Date, date)
      .input("time", sql.Time, time)
      .query(`SELECT COUNT(*) AS Count FROM Appointments
              WHERE CounselorID = @counselorID AND Date = @date AND Time = @time AND Status IN ('Pending', 'Accepted')`);

    if (conflictResult.recordset[0].Count > 0) {
      return res.status(409).send("Counselor already booked at this time.");
    }

    await pool.request()
      .input("studentID", sql.Int, studentID)
      .input("counselorID", sql.Int, counselorID)
      .input("date", sql.Date, date)
      .input("time", sql.Time, time)
      .query(`INSERT INTO Appointments (StudentID, CounselorID, Date, Time, Status)
              VALUES (@studentID, @counselorID, @date, @time, 'Pending')`);
    res.status(201).send("Appointment created.");
  } catch (err) {
    console.error("Error creating appointment:", err);
    res.status(500).send("Database error.");
  }
});

// Get appointments by student ID
app.get("/api/appointments/student/:studentID", async (req, res) => {
  const { studentID } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("studentID", sql.Int, studentID)
      .query(`SELECT a.AppointmentID, a.Date, a.Time, a.Status, c.Name as CounselorName, c.CounselorType
              FROM Appointments a JOIN Counselors c ON a.CounselorID = c.CounselorID
              WHERE a.StudentID = @studentID`);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching appointments:", err);
    res.status(500).send("Database error.");
  }
});

// Update appointment status (accept/reject/cancel)
app.patch("/api/appointments/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input("id", sql.Int, id)
      .input("status", sql.NVarChar, status)
      .query("UPDATE Appointments SET Status = @status WHERE AppointmentID = @id");
    res.send("Appointment status updated.");
  } catch (err) {
    console.error("Error updating appointment:", err);
    res.status(500).send("Database error.");
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server running on port ${port}`));
