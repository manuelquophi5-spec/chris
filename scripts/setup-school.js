require("./dns-patch.js");
const { readFileSync, existsSync } = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const envPath = path.resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

// Define schemas matching the app models
const LocationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  radiusMeters: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  employeeId: { type: String, unique: true, sparse: true, uppercase: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, select: false },
  passwordMustChange: { type: Boolean, default: true },
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  name: { type: String, required: true },
  role: { type: String, enum: ["admin", "user"], default: "user" },
  program: { type: String },
  level: { type: Number },
}, { timestamps: true });

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  courseCode: { type: String },
  program: { type: String },
  level: { type: Number },
  description: { type: String },
  scheduleDays: [{ type: Number }],
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  lateAfterMinutes: { type: Number, default: 15 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Location = mongoose.models.Location || mongoose.model("Location", LocationSchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Course = mongoose.models.Course || mongoose.model("Course", CourseSchema);

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // Find the admin user to own these demo courses
  const admin = await User.findOne({ role: "admin" });
  if (!admin) { console.error("No admin user found"); process.exit(1); }

  // Create a campus
  const location = await Location.findOneAndUpdate(
    { name: "Main Campus" },
    { name: "Main Campus", latitude: 5.6037, longitude: -0.187, radiusMeters: 100, isActive: true },
    { upsert: true, new: true }
  );
  console.log("Campus created:", location.name, "(adjust radius in admin panel)");

  // Create courses for Computer Science Level 200
  const courses = [
    {
      title: "Introduction to Computing",
      courseCode: "CS201",
      program: "computer-science",
      level: 200,
      description: "Fundamentals of computing and programming.",
      scheduleDays: [1, 3, 5], // Mon, Wed, Fri
      startTime: "09:00",
      endTime: "11:00",
      lateAfterMinutes: 15,
      createdBy: admin._id,
      locationId: location._id,
      isActive: true,
    },
    {
      title: "Data Structures & Algorithms",
      courseCode: "CS202",
      program: "computer-science",
      level: 200,
      description: "Advanced data structures and algorithmic thinking.",
      scheduleDays: [2, 4], // Tue, Thu
      startTime: "14:00",
      endTime: "16:00",
      lateAfterMinutes: 15,
      createdBy: admin._id,
      locationId: location._id,
      isActive: true,
    },
  ];

  for (const c of courses) {
    const course = await Course.findOneAndUpdate(
      { courseCode: c.courseCode },
      c,
      { upsert: true, new: true }
    );
    console.log("Course created:", course.courseCode, "-", course.title);
  }

  console.log("\nSetup complete!");
  console.log("Student STU001 can now check in to these classes.");
  console.log("Adjust campus radius at: /dashboard/admin/sites");
  console.log("Adjust class schedules at: /dashboard/admin/courses");

  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
