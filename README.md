# 📋 QR-Based GPS Attendance System

A full-stack web application that automates classroom attendance using QR codes with real-time GPS verification.

## 🌐 Live Demo
**https://qr-attendance-80aq.onrender.com**

> First load may take 50 seconds if inactive. Please wait.

---

## ✨ Features

- 📱 Camera-based QR scanning directly from browser — no app install needed
- 📍 GPS geo-fencing using Haversine formula — attendance only within set radius
- 🔄 Dynamic QR refresh every 15 seconds (Google Authenticator style)
- 🔒 One-time QR tokens — screenshot sharing completely blocked
- 📲 Device fingerprinting — duplicate attendance from same device blocked
- 🚨 Suspicious attempt logging — every failed scan logged with reason and GPS
- 🔐 Security audit dashboard — teacher sees flagged students after class
- ⚙️ Configurable GPS radius — 5m strict to 500m indoor testing
- 📊 30-day attendance analytics chart
- 👩‍🏫 Real-time present students list on teacher dashboard

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.5 |
| Database | MySQL (local), PostgreSQL (production) |
| ORM | Spring Data JPA, Hibernate |
| Security | Spring Security, BCrypt |
| QR Generation | ZXing (Google) |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| QR Scanning | html5-qrcode library |
| Analytics | Chart.js |
| Deployment | Render (Docker), GitHub |

---

## 🔐 How Security Works

1. Teacher starts session → classroom GPS coordinates saved
2. QR generated with UUID token → auto-refreshes every 15 seconds
3. Student scans → browser sends QR token + GPS coordinates + device fingerprint
4. Backend validates all 4 checks:
   - Token exists and not already used
   - Token not expired (20 minute window)
   - Student within configured radius (Haversine formula)
   - Device not already used this session
5. Every failed attempt logged to suspicious_attempts table with reason
6. Teacher views security audit report after class

---

## 🚀 Run Locally

### Prerequisites
- Java 17 or higher
- MySQL 8
- Maven 3.9

### Steps

1. Clone the repository
   git clone https://github.com/BristiGhosh604/qr-attendance.git

2. Navigate to project
   cd qr-attendance/qr-attendance

3. Create MySQL database
   CREATE DATABASE qr_attendance;

4. Update application.properties with your MySQL password

5. Run the application
   mvn spring-boot:run

6. Open in browser
   http://localhost:8080/index.html

---

## 📁 Project Structure

src/main/java/com/example/qr_attendance/
├── controller/
│   ├── AuthController.java
│   ├── TeacherController.java
│   └── StudentController.java
├── model/
│   ├── User.java
│   ├── Session.java
│   ├── Attendance.java
│   └── SuspiciousAttempt.java
├── repository/
├── service/
│   ├── AuthService.java
│   ├── QrService.java
│   └── GeoFenceService.java
└── config/
    └── SecurityConfig.java

src/main/resources/static/
├── index.html       (Login and Register)
├── teacher.html     (Teacher Dashboard)
├── student.html     (Student QR Scanner)
└── style.css

---

## 📸 Pages

| Page | Description |
|---|---|
| Login / Register | Role-based authentication — Teacher and Student |
| Teacher Dashboard | Start session, live QR code, present students, security audit, analytics |
| Student Scanner | Camera QR scanning with real-time GPS verification |
