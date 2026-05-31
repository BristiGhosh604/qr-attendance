package com.example.qr_attendance.controller;

import com.example.qr_attendance.model.Attendance;
import com.example.qr_attendance.model.Session;
import com.example.qr_attendance.model.SuspiciousAttempt;
import com.example.qr_attendance.model.User;
import com.example.qr_attendance.repository.AttendanceRepository;
import com.example.qr_attendance.repository.SessionRepository;
import com.example.qr_attendance.repository.SuspiciousAttemptRepository;
import com.example.qr_attendance.repository.UserRepository;
import com.example.qr_attendance.service.GeoFenceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/student")
public class StudentController {

    @Autowired
    private SessionRepository sessionRepo;

    @Autowired
    private AttendanceRepository attendRepo;

    @Autowired
    private SuspiciousAttemptRepository suspiciousRepo;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private GeoFenceService geoService;

    @PostMapping("/attend")
    public ResponseEntity<Map<String, Object>> markAttendance(
            @RequestBody Map<String, Object> request) {

        Map<String, Object> response = new HashMap<>();

        try {
            String token     = request.get("token").toString();
            Double studentLat = Double.valueOf(request.get("latitude").toString());
            Double studentLng = Double.valueOf(request.get("longitude").toString());
            Long studentId   = Long.valueOf(request.get("studentId").toString());
            String deviceId  = request.get("deviceId").toString();

            // Find student
            User student = userRepo.findById(studentId)
                    .orElseThrow(() -> new RuntimeException("Student not found"));

            // Find session by token
            Session session = sessionRepo
                    .findByQrTokenAndIsActiveTrue(token)
                    .orElse(null);

            // 1. Check if token is valid
            if (session == null) {
                saveSuspicious(null, student, "Invalid or inactive QR token",
                        studentLat, studentLng, deviceId);
                response.put("error", "Invalid QR code");
                return ResponseEntity.badRequest().body(response);
            }

            // 2. Check if QR already used (one-time token — your unique feature)
            if (session.getIsUsed()) {
                saveSuspicious(session, student, "QR token already used",
                        studentLat, studentLng, deviceId);
                response.put("error", "This QR code has already been used");
                return ResponseEntity.badRequest().body(response);
            }

            // 3. Check expiry
            if (LocalDateTime.now().isAfter(session.getExpiresAt())) {
                saveSuspicious(session, student, "QR token expired",
                        studentLat, studentLng, deviceId);
                response.put("error", "QR code has expired");
                return ResponseEntity.badRequest().body(response);
            }

            // 4. Check device fingerprint (your unique feature)
            boolean deviceUsed = attendRepo.existsBySessionIdAndDeviceId(
                    session.getId(), deviceId);
            if (deviceUsed) {
                saveSuspicious(session, student, "Duplicate device fingerprint",
                        studentLat, studentLng, deviceId);
                response.put("error", "Attendance already marked from this device");
                return ResponseEntity.badRequest().body(response);
            }

            // 5. Check GPS distance (5 metre geofence)
            boolean inRange = geoService.isWithinRange(
                    studentLat, studentLng,
                    session.getLatitude(), session.getLongitude(),
                    session.getRadiusMetres());

            if (!inRange) {
                saveSuspicious(session, student, "Student outside 5m radius",
                        studentLat, studentLng, deviceId);
                response.put("error", "You are not in the classroom (outside 5m range)");
                return ResponseEntity.badRequest().body(response);
            }

            // ✅ All checks passed — mark attendance
            Attendance att = new Attendance();
            att.setSession(session);
            att.setStudent(student);
            att.setScannedAt(LocalDateTime.now());
            att.setStudentLat(studentLat);
            att.setStudentLng(studentLng);
            att.setDeviceId(deviceId);
            att.setStatus(Attendance.Status.PRESENT);
            attendRepo.save(att);

            // Mark QR as used (one-time token)
            session.setIsUsed(true);
            sessionRepo.save(session);

            response.put("message", "Attendance marked successfully!");
            response.put("studentName", student.getName());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Helper — save suspicious attempt to DB
    private void saveSuspicious(Session session, User student,
                                String reason, Double lat,
                                Double lng, String deviceId) {
        try {
            SuspiciousAttempt s = new SuspiciousAttempt();
            s.setSession(session);
            s.setStudent(student);
            s.setReason(reason);
            s.setStudentLat(lat);
            s.setStudentLng(lng);
            s.setDeviceId(deviceId);
            suspiciousRepo.save(s);
        } catch (Exception ignored) {}
    }
}