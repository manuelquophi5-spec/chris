# UG Attend — University Setup & Dashboard Guide

**Audience:** University administrators and registrars who are **not** technical.  
**App name:** ug_attend (UG Attend)  
**Last updated:** August 2026  

This guide explains, step by step, how to set up your university in the system, create classes, manage students, and how the **student** and **admin** dashboards work on phones and computers.

---

## Table of contents

1. [What this system does (in plain language)](#1-what-this-system-does-in-plain-language)
2. [Who uses what — roles at a glance](#2-who-uses-what--roles-at-a-glance)
3. [Before you start — what you need](#3-before-you-start--what-you-need)
4. [Part A — First-time technical setup (usually done once by IT)](#4-part-a--first-time-technical-setup-usually-done-once-by-it)
5. [Part B — Administrator: set up the university (your main checklist)](#5-part-b--administrator-set-up-the-university-your-main-checklist)
6. [Part B1 — Step 1: Create campuses (GPS check-in areas)](#6-part-b1--step-1-create-campuses-gps-check-in-areas)
7. [Part B2 — Step 2: Add students](#7-part-b2--step-2-add-students)
8. [Part B3 — Step 3: Create classes and schedules](#8-part-b3--step-3-create-classes-and-schedules)
9. [Part B4 — Step 4: Enroll students into classes](#9-part-b4--step-4-enroll-students-into-classes)
10. [Part B5 — Step 5: Review attendance and reports](#10-part-b5--step-5-review-attendance-and-reports)
11. [Optional admin features](#11-optional-admin-features)
12. [Part C — Student dashboard (phone)](#12-part-c--student-dashboard-phone)
13. [Common problems and fixes](#13-common-problems-and-fixes)
14. [Quick reference — URLs and menu names](#14-quick-reference--urls-and-menu-names)

---

## 1. What this system does (in plain language)

UG Attend is an **attendance app** that runs in a web browser (and can be installed on a phone like an app).

When a student checks in:

1. The phone asks for **location (GPS)**.
2. The system checks whether the student is **inside the campus area** you drew on the map (a “geofence” — a circle around the university building or site).
3. For **scheduled classes**, the system also checks whether check-in is allowed **only during class time** (for example Monday–Friday, 9:00–11:00).

That way, attendance is tied to **being on campus** and **being in the right time window**, not just tapping a button from home.

**Administrators** configure campuses, people, and classes — and review who attended, who was late, and who missed sessions.  
**Students** check in on their phones.

---

## 2. Who uses what — roles at a glance

| Role | Who | How they sign in | Main screen |
|------|-----|------------------|-------------|
| **Administrator** | Registrar, IT, university admin | **Email + password** at **Admin sign in** | Desktop admin area — full setup |
| **Student** | Learners | **Student ID + password** at **Sign in** | Phone — check in / check out |

---

## 3. Before you start — what you need

### From your university

- A list of **student IDs** you will assign (for example `E10234`, `DL2026-001`).
- **First names** for each student.
- **Class timetable** information: course name, which days, start time, end time, which campus/room.
- For each campus: you (or a staff member) must stand at the building once with a phone or laptop to **pin the location on the map** (explained below).

### From your IT team (one-time)

- The app must be **hosted online** (for example on Vercel) with a web address students can open.
- A **database** (MongoDB) and a **first administrator account** must exist before you can sign in as admin.
- Students need **internet** and **location services enabled** on their phones.

If you only use the admin screens and someone else already created the first admin account, you can skip Part A and start at [Part B](#5-part-b--administrator-set-up-the-university-your-main-checklist).

---

## 4. Part A — First-time technical setup (usually done once by IT)

This section is for whoever deploys the app the first time. **University admins can skip to Part B** if the app URL and admin login already work.

### A.1 Create the first administrator account

The first admin cannot be added from the website. It is created on a computer that has access to the project files and database password.

1. Open the project folder on a computer with Node.js installed.
2. Copy `.env.example` to `.env.local` and fill in:
   - `MONGODB_URI` — connection string from MongoDB Atlas.
   - `JWT_SECRET` — a long random secret (at least 32 characters).
3. Run the create-admin command.

**Example (PowerShell on Windows):**

```powershell
$env:ADMIN_EMAIL="registrar@youruniversity.edu"
$env:ADMIN_PASSWORD="YourSecurePass1"
$env:ADMIN_NAME="UG Admin"
npm run create-admin
```

**Password rules for admin:** at least 10 characters, with both letters and numbers.

4. Open the app in a browser and go to **Admin sign in** (see [Quick reference](#14-quick-reference--urls-and-menu-names)).
5. Sign in with that **email** and **password**.

### A.2 Deploy the app so students can open it on phones

Typically the app is deployed to **Vercel** (or similar). IT must set the same `MONGODB_URI` and `JWT_SECRET` in the hosting dashboard, then give you the live URL (for example `https://ug-attend.vercel.app`).

Students should use **HTTPS** (a normal `https://` link). GPS on phones usually does not work on insecure `http://` links.

---

## 5. Part B — Administrator: set up the university (your main checklist)

After you sign in as **admin**, you land on **Start here** (`/dashboard/admin`). That page shows a **setup checklist** in order:

| Step | What you do | Menu name |
|------|-------------|-----------|
| 1 | Create campuses (GPS areas) | **Campuses** |
| 2 | Add students | **Students & staff** |
| 3 | Create classes with schedules | **Classes** |
| 4 | Enroll students into each class | **Classes** (same page) |
| 5 | Review attendance | **Classes** (reports) and **Attendance log** |

Do these steps **in order**. If you create a class before you have a campus, the form will not have anywhere to check in.

### How to open the admin area

1. Open the university’s app URL in a **computer browser** (Chrome, Edge, or Firefox).
2. Go to **Admin sign in** (link from the student sign-in page, or add `/login/admin` to your site address).
3. Enter your **admin email** and **password**.
4. You should see the sidebar: **Start here**, **Classes**, **Students & staff**, **Campuses**, etc.

**Tip:** The student sign-in page is separate. Do not confuse **Admin sign in** (email) with **Sign in** (Student ID).

---

## 6. Part B1 — Step 1: Create campuses (GPS check-in areas)

**Menu:** **Campuses** (`/dashboard/admin/sites`)

A **campus** (also called a site or workplace) is a point on the map with a **radius**. A student is “on campus” when their phone GPS is inside that circle.

### 6.1 Why campuses matter

- Without at least one active campus, students may see: *“No campuses configured.”*
- Each **class** can be linked to a campus so check-in only counts when the student is at the right building.
- The radius should be large enough to cover the building and nearby yard, but not so large that a student blocks away could check in.

### 6.2 Create a new campus — detailed steps

1. Go to **Campuses**.
2. On the map, you will see circles for existing sites (if any).
3. Fill in the form (usually on the side or below the map):

   | Field | What to enter | Notes |
   |-------|---------------|-------|
   | **Site name** | e.g. `Main Campus — Block A` | Use names staff and students recognize. |
   | **Latitude / Longitude** | Set by clicking the map | Click the **center** of the building or gate where students stand to check in. |
   | **Radius (meters)** | e.g. `80`–`150` | Start around 100 m; increase if GPS says students are “outside” when they are in the yard. |

4. **Use the map click:** Click the exact spot on the map where check-in should be centered. The pin moves to that location.
5. **Optional — search:** If the page has a location search box, you can search for the university name, then fine-tune by clicking the map.
6. **Optional — “Use my location”:** If you are standing at the campus with the same device, use the button that reads your current GPS (browser will ask permission). This is the most accurate method.
7. Adjust the **radius slider** until the circle comfortably covers the area where students wait (not the whole city).
8. Click **Save** or **Create** (wording may say “Created …” when successful).
9. Repeat for every building or site where attendance should work (hostel, annex, lab block, etc.).

### 6.3 Edit, disable, or deactivate a campus

- Click an existing site in the list to load it on the map.
- Change name, position, or radius, then save.
- **Disable / deactivate** if a site is closed temporarily — inactive sites should not be used for new classes.

### 6.4 Practical tips for non-technical staff

- Test with one student phone **standing where students queue** before opening to hundreds of users.
- GPS can be off by 10–30 meters; a slightly **larger radius** is safer than too small.
- Tall buildings sometimes push GPS to the street; if many false “outside campus” errors appear, widen the radius or re-pin from the courtyard.

---

## 7. Part B2 — Step 2: Add students

**Menu:** **Students & staff** (`/dashboard/admin/users`)

Here you create student accounts. Each student gets a **Student ID** (stored as employee ID in the system). Only the **main administrator** uses email login.

### 7.1 Add one student — field by field

1. Open **Students & staff**.
2. In **Add a new person**:

   | Field | What to type | Example |
   |-------|--------------|---------|
   | **First name** | Student’s first name | `Ama` |
   | **Student ID** | Unique ID they will type every login | `E10234` (letters are stored uppercase) |
   | **Program** | Their course of study | Computer Science |
   | **Level** | Their academic level | 100–400 |

3. Click **Add student**.
4. On success, the system creates the account **without a password yet** and shows a **one-time setup code** (e.g. `AB12XY`) — it only appears once, so give it to the student right away. Status shows **Needs to set password**.

### 7.2 What to tell the student after you add them

Use **Copy instructions** on their row (only pre-fills the code if it's still shown on screen), or send this message:

> 1. Open **UG Attend** (your university link).  
> 2. Tap **Set password**.  
> 3. Enter your **Student ID**: `E10234`  
> 4. Enter the **setup code** you were given: `AB12XY`  
> 5. Choose a password, then **Sign in**.  
> 6. During class, open the app and **Check in to class** (with GPS on).

The setup code is required — without it, Set password will reject the request. This stops someone from guessing a Student ID and claiming another person's account. If the code is lost or expires (14 days), use **Reset password** to issue a new one.

### 7.3 Status meanings in the user table

| Status | Meaning | What you should do |
|--------|---------|-------------------|
| **Needs to set password** | Account new; they never chose a password | Send them the instructions above |
| **Ready to check in** | Password set; student can use the app | Nothing |
| **Locked (too many wrong passwords)** | Too many failed login attempts | Click **Unlock**, then tell them to try again |

### 7.4 Reset password

If someone forgot their password:

1. Find them in the table (status **Ready to check in**).
2. Click **Reset password**.
3. A new **one-time setup code** appears — give it to them, then tell them to use **Set password** again with their Student ID, the new code, and a new password.

You do **not** see their new password — they choose it themselves. Their old setup code (if any) stops working once you reset.

---

## 8. Part B3 — Step 3: Create classes and schedules

**Menu:** **Classes** (`/dashboard/admin/courses`)

A **class** (course) is a recurring timetable: title, campus, days of week, start/end time, and how many minutes late counts as “late.” Whichever admin creates a class is recorded as its creator, shown on the class list.

### 8.1 Before creating a class, confirm

- [ ] At least one **campus** exists and is active.  
- [ ] You know the **days** and **times** for the course.

### 8.2 Create a class — every field explained

1. Open **Classes**.
2. In **Create a class**, fill in:

   | Field | Required? | Explanation |
   |-------|-----------|-------------|
   | **Course title** | Yes | Name shown to students, e.g. `Introduction to Computing` |
   | **Description** | No | Extra notes (optional) |
   | **Campus / room GPS** | Recommended | Which geofence students must be inside to check in for this class |
   | **Start time** | Yes | When check-in window opens, e.g. `09:00` |
   | **End time** | Yes | When the class session ends for attendance, e.g. `11:00` — must be **after** start |
   | **Late after (minutes)** | Yes | Grace period after start time; e.g. `15` means check-in before 9:15 is on time, after that counts as **late** |
   | **Class days** | Yes | Tap each weekday the class runs (Mon–Sun chips) |

3. Click **Create class**.
4. The class appears in **All classes** on the left.

### 8.3 How the schedule affects students (important)

The system evaluates the student’s phone time against this schedule:

- **Wrong day:** Student sees that class is not scheduled today (e.g. “Class is not scheduled today (Sat).”).
- **Before start:** “Class starts at 09:00.” — check-in buttons disabled.
- **During class:** Class is **active** — check-in and check-out allowed (if enrolled and on campus).
- **After end:** “Class ended at 11:00.” — no more check-in for that session.
- **Late:** If they check in after start time + **Late after** minutes, the mark is recorded as **late**.

Students enrolled in a class use the **class check-in screen** on their phone (not the simple daily office check-in).

### 8.4 “Active now” on the class list

If the current day and time fall inside a class’s schedule, the admin list may show **Active now**. That helps you know which classes students should be checking into at this moment.

### 8.5 The class QR code (one code for check-in and check-out)

Each class has **one** QR code. Open **Classes**, select the class, and find **Class QR (check-in & check-out)**. Use **Download** to print it or **Copy link** to paste it into a slide, and display it in the lecture room.

How students use it:

1. They scan the code with the normal **phone camera**, sign in if asked, and allow location.
2. **First scan of the day = check-in.** The system sees they have not checked in to this class yet today.
3. **Scan again later = check-out.** The system sees they are already checked in and records the check-out instead.
4. A check-out is only accepted **at least 5 minutes after** the check-in. This stops an accidental double-scan at the door from checking a student straight back out.
5. Once they have both checked in and out, further scans say they are already done for today.

Good to know:

- The QR only names the class. **Location is still checked from the student’s own phone GPS**, so a photo of the code sent to someone off-campus does not check them in.
- A check-in scan outside the class time window is refused, so a late scan is never treated as a check-out.
- The same code works all term. If you deactivate a class, its QR stops working immediately.
- QR codes printed before this change (separate check-in and check-out codes) still work; both now behave as the single combined code.
- Changing the `JWT_SECRET` setting invalidates every printed QR code, so reprint them if it is ever rotated.

---

## 9. Part B4 — Step 4: Enroll students into classes

Still on **Classes** — you must **select a class** before enrolling anyone.

### 9.1 Enroll students

1. In **All classes**, click the class name.
2. On the right, find **Enroll students**.
3. In the multi-select list, choose students who are **not** yet in the class.  
   - On Windows: hold **Ctrl** and click each name.  
   - On Mac: hold **Command** and click.
4. Click **Add to class**.
5. Enrolled students appear in the list below with a **Remove** option if you added someone by mistake.

### 9.2 What happens if a student is not enrolled

On the phone they may see: *“No classes assigned yet. Ask your administrator to enroll you.”*  
They cannot check in to that course until enrolled.

### 9.3 Remove a student from a class

Click **Remove** next to their name in the enrolled list. This does not delete their university account — only removes them from that course.

---

## 10. Part B5 — Step 5: Review attendance and reports

### 10.1 Per-class report (best for registrars)

1. **Classes** → select the class.
2. Scroll to **Attendance report**.
3. Use **Search student** to filter a long list.
4. The table shows (typically for about the **last 4 weeks**):

   | Column | Meaning |
   |--------|---------|
   | **Student** | Name |
   | **%** | Attendance percentage over expected sessions |
   | **Late** | Number of late check-ins |
   | **Missed** | Sessions they did not check in for |

### 10.2 University-wide attendance log

**Menu:** **Attendance log** (`/dashboard/admin/attendance`)

Shows individual check-in/check-out records across the university. Use this when you need a raw list of marks for a day, not only class percentages.

### 10.3 Start here dashboard numbers

On **Start here**, tiles may show:

- **Students & staff** — how many accounts exist  
- **Need password setup** — how many still must use **Set password** (highlighted if > 0)  
- **Campuses active** — count of enabled sites  
- **Marks today** — how many attendance marks were recorded today  

Use **Need password setup** before the first day of class so every student can log in.

---

## 11. Optional admin features

### 11.1 One-off sessions

**Menu:** **One-off sessions** (`/dashboard/admin/sessions`)

For special events **outside** the weekly class schedule (exams, workshops, assemblies). Most universities using **Classes** with weekly timetables can **skip** this page.

If used, you create a session with title, optional course code, site, start datetime, and end datetime. Students in **session mode** pick that session when checking in.

### 11.2 Activity history

**Menu:** **Activity history** (`/dashboard/admin/audit`)

A log of important admin actions (creating users, classes, etc.) for accountability. You do not need this for day-to-day setup.

### 11.3 Branding

**Menu:** **Branding** (`/dashboard/admin/settings`)

Set the **app name** and **logo** shown across the whole app — sign-in pages, the student dashboard, the admin sidebar, and the installable PWA icon. Paste a link to a logo image already hosted somewhere (your university website, etc.); there is no file upload. Leave the logo field blank to use the default logo, which is the official University of Ghana logo (`public/ug-logo.png`). Changes take effect for everyone within about 30 seconds.

### 11.4 Daily attendance (no classes)

If students are **not enrolled in any class**, their phone shows **daily** check-in: one check-in and one check-out per day at a selected campus. That mode suits **offices or workplaces**, not typical timed university periods. For universities, prefer **classes + enrollment** so attendance follows the timetable.

---

## 12. Part C — Student dashboard (phone)

**Who:** Students (`user` role)  
**Sign in:** `/login` with **Student ID + password**  
**Main URL after login:** `/dashboard`  
**Designed for:** Mobile phone browsers; can be installed to home screen (PWA)

### 12.1 Installing on the phone (recommended)

1. Open the university link in **Chrome** (Android) or **Safari** (iPhone).
2. Android: use the **Install** prompt or browser menu → Install app.  
3. iPhone: **Share** → **Add to Home Screen**.
4. Allow **location** when the browser asks — required for check-in.

### 12.2 Home screen layout

| Area | What it shows |
|------|----------------|
| **Top bar** | Greeting and student’s first name, **Sign out** |
| **Main card** | Today’s attendance status and buttons |
| **Bottom tabs** | **Home** and **History** |

### 12.3 Two different home experiences

The app **automatically** picks the right screen:

#### A) Class mode (typical for universities)

**When:** Student is **enrolled in at least one class**.

**What they see:**

- Short instruction: select the class they are attending.
- Dropdown: **Class in session** — only classes that are **active right now** (correct day and between start and end time).
- Info panel: whether the window is active, campus name, and a warning if the next check-in will count as **late**.
- Buttons:
  - **Check in to class** — records arrival (needs GPS inside campus if class has a site).
  - **Check out of class** — records leaving (after check-in).

**Rules students should know:**

- They must be **physically on campus** (inside the GPS circle).
- They can only check in **during class hours**.
- If no class is active, they see: *“No class is active right now”* with a reason (wrong day, too early, class ended).
- Other enrolled classes may appear under **Other enrolled classes (not active now)**.

#### B) Daily mode (workplace / no classes)

**When:** Student has **no class enrollments**.

**What they see:**

- **Attendance** summary for today: check-in time, check-out time, badges like **Complete**, **On campus**, **Not in yet**.
- **Campus** dropdown (unless already checked in — then site is locked).
- **Check in** and **Check out** buttons.
- Distance hint text explaining if they are near the campus or outside.
- Evening reminder after 5 PM if they checked in but forgot check-out.

Universities using timetabled classes should enroll everyone so students get **class mode**, not daily mode.

### 12.4 History tab

**Menu tab:** **History** (`/dashboard/history`)

Lists past attendance by day so students can prove they marked in. Read-only.

### 12.5 Student first-time password

1. Admin adds student → status **Needs to set password**, and gets a one-time setup code to hand to the student.
2. Student opens **Set password** (`/set-password`).
3. Enters **Student ID**, the **setup code** from their admin, and a new password (meets strength rules).
4. Signs in from **Sign in**.

### 12.6 Common student error messages (plain meaning)

| Message | What it means | What to do |
|---------|---------------|------------|
| Outside campus / geofence | GPS says they are outside the circle | Move closer; widen campus radius if GPS is weak |
| Class not scheduled today | Wrong weekday for that course | Wait for correct day or fix schedule in admin |
| Class starts at … | Too early | Wait until start time |
| Class ended at … | Too late | Contact admin if exception needed |
| No classes assigned | Not enrolled | Admin must enroll them under **Classes** |
| Location permission denied | Phone blocked GPS | Enable location for the browser in phone settings |
| Select a class that is active | No active class selected | Choose from dropdown during class hours |
| You checked in a moment ago. Scan again in N minutes to check out | They scanned the QR again too soon after checking in | Wait the stated minutes, then scan again to check out |
| You’ve already checked in and out of this class today | Both check-in and check-out are already recorded | Nothing to do; attendance for today is complete |
| This QR code is invalid or expired | Code is damaged, from another system, or the secret was changed | Print a fresh code from **Classes** |

---

## 13. Common problems and fixes

### Setup phase

| Problem | Fix |
|---------|-----|
| Cannot sign in as admin | Confirm IT ran `create-admin`; use real email format; password 10+ chars with letters and numbers |
| No campus in dropdown | Create and **activate** a site under **Campuses** |
| Student ID already exists | Use a unique ID or find existing user in the table |

### During term

| Problem | Fix |
|---------|-----|
| Whole class “outside campus” | Increase campus radius; re-pin map from courtyard; test one phone on site |
| One student always late | They may be checking in after grace period; adjust **Late after** if policy allows |
| Student sees no active class | Check enrollment, day of week, and clock on phone (wrong time zone rare but possible) |

---

## 14. Quick reference — URLs and menu names

Replace `https://YOUR-UG-ATTEND-URL` with your real deployed address.

| Page | Path |
|------|------|
| Student sign in | `https://YOUR-UG-ATTEND-URL/login` |
| Set password | `https://YOUR-UG-ATTEND-URL/set-password` |
| Admin sign in | `https://YOUR-UG-ATTEND-URL/login/admin` |
| Admin home (checklist) | `https://YOUR-UG-ATTEND-URL/dashboard/admin` |
| Campuses | `https://YOUR-UG-ATTEND-URL/dashboard/admin/sites` |
| Students & staff | `https://YOUR-UG-ATTEND-URL/dashboard/admin/users` |
| Classes | `https://YOUR-UG-ATTEND-URL/dashboard/admin/courses` |
| Student home (check-in) | `https://YOUR-UG-ATTEND-URL/dashboard` |
| Student history | `https://YOUR-UG-ATTEND-URL/dashboard/history` |

---

## End-to-end example (small university)

1. **IT** creates admin `registrar@ug.edu.gh` and deploys the app.  
2. **Admin** creates campus `Main Building` with 120 m radius.  
3. **Admin** adds students `E101`, `E102`, `E103`.  
4. **Admin** creates class `Math 101`, Mon/Wed/Fri 10:00–12:00, campus Main Building, late after 10 minutes.  
5. **Admin** enrolls E101, E102, E103 into Math 101.  
6. **Students** set passwords and, at 10:05 on Monday at the building, check in to **Math 101**.  
7. **Admin** opens the **Attendance report** for Math 101 and reviews who is late or missed sessions.

---

*This document describes the UG Attend (ella) application as implemented in this repository. If your deployed version differs, compare menu labels with your live site.*
