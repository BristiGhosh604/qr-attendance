package com.example.qr_attendance.controller;

import com.example.qr_attendance.model.Session;
import com.example.qr_attendance.model.User;
import com.example.qr_attendance.repository.AttendanceRepository;
import com.example.qr_attendance.repository.SessionRepository;
import com.example.qr_attendance.repository.SuspiciousAttemptRepository;
import com.example.qr_attendance.repository.UserRepository;
import com.example.qr_attendance.service.QrService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.ArrayList;
import java.util.LinkedHashMap;


@RestController
@RequestMapping("/api/teacher")
public class TeacherController {

    @Autowired
    private SessionRepository sessionRepo;

    @Autowired
    private QrService qrService;

    @Autowired
    private AttendanceRepository attendRepo;

    @Autowired
    private SuspiciousAttemptRepository suspiciousRepo;

    @Autowired
    private UserRepository userRepo;

    // POST /api/teacher/session — teacher starts attendance session
    @PostMapping("/session")
    public ResponseEntity<Map<String, Object>> createSession(
            @RequestBody Map<String, Object> request) {
        try {
            Long teacherId = Long.valueOf(request.get("teacherId").toString());
            Double latitude = Double.valueOf(request.get("latitude").toString());
            Double longitude = Double.valueOf(request.get("longitude").toString());

            User teacher = userRepo.findById(teacherId)
                    .orElseThrow(() -> new RuntimeException("Teacher not found"));

            // Create session
            Session session = new Session();
            session.setTeacher(teacher);
            session.setQrToken(UUID.randomUUID().toString());
            session.setLatitude(latitude);
            session.setLongitude(longitude);
            Integer radius = request.containsKey("radiusMetres") ?
                    Integer.valueOf(request.get("radiusMetres").toString()) : 500;
            session.setRadiusMetres(radius);

            session.setExpiresAt(LocalDateTime.now().plusMinutes(20));
            session.setIsActive(true);
            session.setIsUsed(false);
            sessionRepo.save(session);

            // Generate QR code as base64
            String qrImage = qrService.generateQrBase64(session.getQrToken());

            Map<String, Object> response = new HashMap<>();
            response.put("sessionId", session.getId());
            response.put("qrToken", session.getQrToken());
            response.put("qrImage", qrImage);
            response.put("expiresAt", session.getExpiresAt().toString());
            response.put("message", "Session created successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // GET /api/teacher/session/{id}/present — get present students
    @GetMapping("/session/{id}/present")
    public ResponseEntity<List<Map<String, Object>>> getPresentStudents(
            @PathVariable Long id) {

        var attendanceList = attendRepo.findBySessionId(id);

        List<Map<String, Object>> result = attendanceList.stream().map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("studentId", a.getStudent().getId());
            map.put("studentName", a.getStudent().getName());
            map.put("scannedAt", a.getScannedAt().toString());
            map.put("status", a.getStatus().toString());
            return map;
        }).toList();

        return ResponseEntity.ok(result);
    }

    // GET /api/teacher/session/{id}/audit — security audit (your unique feature)
    @GetMapping("/session/{id}/audit")
    public ResponseEntity<Map<String, Object>> getAuditReport(
            @PathVariable Long id) {

        var presentList    = attendRepo.findBySessionId(id);
        var suspiciousList = suspiciousRepo.findBySessionId(id);

        Map<String, Object> report = new HashMap<>();
        report.put("totalPresent", presentList.size());
        report.put("totalSuspicious", suspiciousList.size());

        List<Map<String, Object>> suspicious = suspiciousList.stream().map(s -> {
            Map<String, Object> map = new HashMap<>();
            map.put("studentName", s.getStudent().getName());
            map.put("reason", s.getReason());
            map.put("attemptedAt", s.getAttemptedAt().toString());
            map.put("lat", s.getStudentLat());
            map.put("lng", s.getStudentLng());
            return map;
        }).toList();

        report.put("suspiciousAttempts", suspicious);
        return ResponseEntity.ok(report);
    }
    // POST /api/teacher/session/{id}/refresh-qr
// Generates a fresh QR token for existing session
    @PostMapping("/session/{id}/refresh-qr")
    public ResponseEntity<Map<String, Object>> refreshQr(
            @PathVariable Long id) {
        try {
            Session session = sessionRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Session not found"));

            // Generate brand new token
            session.setQrToken(UUID.randomUUID().toString());
            session.setIsUsed(false); // reset used flag for new token
            session.setExpiresAt(LocalDateTime.now().plusMinutes(20));
            sessionRepo.save(session);

            // Generate new QR image
            String qrImage = qrService.generateQrBase64(session.getQrToken());

            Map<String, Object> response = new HashMap<>();
            response.put("qrToken", session.getQrToken());
            response.put("qrImage", qrImage);
            response.put("refreshedAt", LocalDateTime.now().toString());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    // GET /api/teacher/analytics?teacherId=1
    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics(
            @RequestParam Long teacherId) {
        try {
            // Get all sessions for this teacher
            List<Session> sessions = sessionRepo.findByTeacherId(teacherId);

            // Group attendance by date
            Map<String, Long> attendanceByDate = new LinkedHashMap<>();

            // Get last 30 days
            for (int i = 29; i >= 0; i--) {
                LocalDateTime date = LocalDateTime.now().minusDays(i);
                String dateStr = date.toLocalDate().toString();
                attendanceByDate.put(dateStr, 0L);
            }

            // Count attendance per day
            for (Session s : sessions) {
                String dateStr = s.getCreatedAt().toLocalDate().toString();
                if (attendanceByDate.containsKey(dateStr)) {
                    List<com.example.qr_attendance.model.Attendance> att =
                            attendRepo.findBySessionId(s.getId());
                    attendanceByDate.put(dateStr,
                            attendanceByDate.get(dateStr) + att.size());
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("labels", new ArrayList<>(attendanceByDate.keySet()));
            response.put("data",   new ArrayList<>(attendanceByDate.values()));
            response.put("totalSessions", sessions.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}