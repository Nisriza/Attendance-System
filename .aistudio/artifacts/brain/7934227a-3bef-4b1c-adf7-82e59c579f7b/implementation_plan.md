# Location-Based Attendance & Report Submission System

A full-stack, university-grade web platform for lecturers and students featuring GPS-verified attendance sessions (via physical QR scan or remote device location), strict server-enforced report submission gating, interactive location audit mapping, and secure multi-file document handling.

> [!IMPORTANT]
> **User Review & Confirmed Decisions from Phase 1 Clarifications**
> - **Dual Attendance Modes**: Lecturers can launch sessions with either an in-person dynamic QR code scanner or remote direct GPS check-in. Both modes capture and log device GPS coordinates, location accuracy radius, and authoritative server timestamps.
> - **Evidence-Based Location Audit**: Attendance records capture GPS latitude, longitude, and accuracy (in meters) for lecturer map audits without fabricating unverified street addresses.
> - **In-App Document Previews**: Report submissions support multiple attachments (PDF, DOC/DOCX, PPTX, JPG, PNG) with in-app preview modals alongside secure direct downloads.
> - **Backend Attendance Gating (Crucial Rule)**: Report submission is strictly blocked and rejected at the API/database layer if no valid approved attendance record exists for the student in that session.

---

## 1. Overview & Core Concept

- **What It Does**: The platform manages the entire academic lifecycle of class check-in and coursework submission. Lecturers approve student registrations, manage course sessions, monitor student attendance with GPS verification, inspect location accuracy on interactive maps, and download or preview submitted coursework. Students register under specific lecturers, mark attendance using their device's GPS (or in-class QR scanner), and submit linked reports once verified.
- **Target Audience / Persona**: University lecturers overseeing academic accountability and students submitting coursework in campus lecture halls or remote field assignments.
- **Key Value**: Guarantees authentic student attendance by capturing location telemetry and strictly enforces academic integrity through server-side gating of report submissions.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Authentication & Student Approval Flow**:
   - Lecturers register with academic email and full credentials; their profiles are immediately active.
   - Students register by selecting their assigned lecturer from a searchable directory, providing matriculation number and university email.
   - Newly registered students enter a `Pending Approval` holding state.
   - The assigned lecturer reviews pending requests in the "Student Approvals" console with one-click Approve or Reject actions.
   - Upon approval, student credentials unlock access to dashboards, sessions, attendance, and reports.

2. **Attendance Session & Check-In Flow**:
   - The lecturer creates an attendance session (e.g., "Lecture 04: Distributed Systems") and chooses either **Physical In-Person (QR Mode)** or **Remote Location Check-In**.
   - For QR mode, the lecturer displays an encrypted dynamic QR code on the lecture hall screen; students scan it using their mobile/laptop camera, which simultaneously triggers device geolocation capture.
   - For remote mode, students open the session, grant browser geolocation permissions, and submit their location telemetry (latitude, longitude, accuracy radius).
   - The backend validates student approval, prevents duplicate attendance, stamps the official server time, and stores the record.

3. **Mandatory Attendance & Report Submission Flow**:
   - Students open the course/session submission portal.
   - If attendance has **not** been recorded, the submission interface is disabled with a prominent message: *"Attendance Required. Please mark your attendance and record your location before submitting your report."*
   - Once attendance is confirmed, the submission form unlocks.
   - Students provide the report title, description, and upload files (PDF, Word, presentations, images) while capturing fresh report-time GPS telemetry.
   - The server verifies attendance records independently before accepting and storing the file upload.

4. **Lecturer Review & Audit Flow**:
   - Lecturers access high-density dashboards summarizing approved students, pending queues, today's attendance logs, and submitted coursework.
   - Attendance logs display coordinates, accuracy radius (in meters), timestamp, and an interactive Leaflet/OpenStreetMap preview modal.
   - Report submission tables allow instant document preview and direct original file download.

### Visual Identity & Theme

- **Color Palette (60-30-10 Distribution)**:
  - **Dominant Canvas (60%)**: Clean university off-white/light blue (`#F5F9FF`) with crisp white card surfaces (`#FFFFFF`).
  - **Structural Surfaces (30%)**: Deep Academic Navy (`#173B70`) for sidebars and primary typography; subtle slate hairline borders (`#E2E8F0`).
  - **Accent Budget (10%)**: Vibrant Royal Blue (`#2563EB`) for primary action buttons, active navigation markers, and focus states.
  - **Semantic Accents**: Forest Green (`#16A34A`) for verified attendance; Amber (`#D97706`) for pending approvals; Crimson (`#DC2626`) for rejections or attendance gaps.
- **Typography & Hierarchy**:
  - Primary Display & Headings: `Plus Jakarta Sans` for clean, professional academic structure.
  - Body Prose: `DM Sans` for high legibility at 13px–15px.
  - Telemetry & Coordinates: `font-mono tabular-nums` for latitude, longitude, and timestamps.
- **Component Styling & Layout**:
  - Fixed 260px desktop navigation sidebar with collapsible mobile drawer.
  - Top bar with contextual breadcrumbs, quick role switch/logout, and user matriculation/title badge.
  - Zero-pill metadata discipline: unboxed text separated by `·` markers.
  - High-density data tables with responsive horizontal scrolling, sticky headers, and row hover illumination.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual Attendance Modes (QR vs. Remote GPS)**
  - *Chosen Approach*: Support both in-person dynamic QR scanning and direct device geolocation check-in, configured per attendance session by the lecturer.
  - *Why*: Gives instructors complete flexibility whether they are in a physical lecture theater or running remote fieldwork, while maintaining location audit trails for both.
  - *Alternatives Considered*: Requiring physical QR only was too rigid for remote sessions; GPS only lacked the physical presence check desired for lecture halls.

- **Decision 2: Authoritative Server Verification for Mandatory Submission**
  - *Chosen Approach*: Enforce attendance prerequisites directly in the server API middleware, rejecting any report payload whose student ID and session ID lack an existing approved attendance record.
  - *Why*: Frontend button states can be bypassed by inspecting network requests or altering DOM state. Server-side validation guarantees compliance with academic integrity guidelines.

- **Decision 3: Separate Geolocation Capture for Attendance and Report Submission**
  - *Chosen Approach*: Geolocation is captured anew at the moment of report submission, rather than reusing attendance coordinates.
  - *Why*: Students might attend a morning lecture and submit their lab report hours later from a different location. Accurately tracking both timestamps and coordinates preserves an authentic audit log.

- **Decision 4: File Storage and In-App Preview Engine**
  - *Chosen Approach*: Store uploaded files on the persistent disk backend with MIME type classification and unique content addresses. Provide in-app preview for PDFs and images, plus download handlers for Word/Office formats.
  - *Why*: Allows lecturers to grade reports rapidly without requiring external desktop software for every submission.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT / BROWSER INTERFACE                            │
│  ┌───────────────────────┐  ┌────────────────────────┐  ┌────────────────────┐  │
│  │   Lecturer Console    │  │    Student Console     │  │  Auth & Onboarding │  │
│  │  - Approvals & Rosters│  │  - GPS Attendance Mark │  │  - Role Selection  │  │
│  │  - Sessions & QR Gen  │  │  - QR Scanner View     │  │  - Lecturer Match  │  │
│  │  - Location Map Audit │  │  - Gated Report Upload │  │  - Approval Notice │  │
│  │  - Report Download    │  │  - Document Previews   │  │  - Password Reset  │  │
│  └───────────┬───────────┘  └───────────┬────────────┘  └─────────┬──────────┘  │
└──────────────┼──────────────────────────┼─────────────────────────┼─────────────┘
               │                          │                         │              
               ▼                          ▼                         ▼              
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        FULL-STACK API LAYER (PORT 3000)                         │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │ Authentication & RBAC Middleware: Session tokens, Lecturer/Student scoping│  │
│  ├───────────────────────────────────────────────────────────────────────────┤  │
│  │ Attendance Controller: GPS capture, accuracy check, duplicate protection │  │
│  ├───────────────────────────────────────────────────────────────────────────┤  │
│  │ Mandatory Gatekeeper: Verifies attendance session link before report save │  │
│  ├───────────────────────────────────────────────────────────────────────────┤  │
│  │ Storage & Upload Engine: Multipart file parsing, MIME safety, disk writes │  │
│  └──────────────────────────────────────┬────────────────────────────────────┘  │
└─────────────────────────────────────────┼───────────────────────────────────────┘
                                          │                                        
                                          ▼                                        
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     PERSISTENT STORAGE & FILE SYSTEM                            │
│  ┌─────────────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │           Database (SQLite)             │  │      Secure Upload Store     │  │
│  │  - users (roles, approval status)       │  │  - reports/student_id/...    │  │
│  │  - attendance_sessions (qr, type, date) │  │  - original filenames        │  │
│  │  - attendance_records (gps, accuracy)   │  │  - mime types & hashes       │  │
│  │  - report_submissions (audit history)   │  │  - authorized download route │  │
│  └─────────────────────────────────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Entities

- **Users**: `id`, `name`, `email`, `password_hash`, `role` (`lecturer` | `student`), `matriculation_number` (unique for students), `lecturer_id` (foreign key for assigned lecturer), `status` (`pending_approval` | `approved` | `rejected`), `created_at`.
- **Attendance Sessions**: `id`, `lecturer_id`, `course_code`, `title`, `session_date`, `mode` (`qr_code` | `gps_direct`), `qr_token`, `status` (`active` | `closed`), `created_at`.
- **Attendance Records**: `id`, `session_id`, `student_id`, `latitude`, `longitude`, `accuracy_meters`, `device_timestamp`, `server_timestamp`, `status` (`present`), `check_in_mode`.
- **Report Submissions**: `id`, `session_id`, `attendance_record_id` (mandatory reference), `student_id`, `title`, `description`, `latitude`, `longitude`, `accuracy_meters`, `submitted_at`, `version`.
- **Report Attachments**: `id`, `report_id`, `original_name`, `storage_path`, `mime_type`, `file_size_bytes`, `created_at`.

### Verification & Test Scenarios

1. Unapproved student login produces the "Pending Approval" holding notice with restricted views.
2. Lecturer approves student; student session transitions immediately to authorized dashboard.
3. Student attempts to submit report without attendance; backend rejects with `403 Attendance Required`.
4. Student marks attendance with browser GPS coordinates; backend commits record with server timestamp.
5. Student uploads report with attachments; backend verifies attendance link and saves files to persistent store.
6. Lecturer reviews student detail page with attendance logs, interactive map pin, and in-app report previews.
