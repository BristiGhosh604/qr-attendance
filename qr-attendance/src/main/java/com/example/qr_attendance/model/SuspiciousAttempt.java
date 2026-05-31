package com.example.qr_attendance.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "suspicious_attempts")
public class SuspiciousAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "session_id")
    private Session session;

    @ManyToOne
    @JoinColumn(name = "student_id")
    private User student;

    private String reason;
    private Double studentLat;
    private Double studentLng;
    private String deviceId;

    private LocalDateTime attemptedAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Session getSession() { return session; }
    public void setSession(Session session) { this.session = session; }

    public User getStudent() { return student; }
    public void setStudent(User student) { this.student = student; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public Double getStudentLat() { return studentLat; }
    public void setStudentLat(Double studentLat) { this.studentLat = studentLat; }

    public Double getStudentLng() { return studentLng; }
    public void setStudentLng(Double studentLng) { this.studentLng = studentLng; }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public LocalDateTime getAttemptedAt() { return attemptedAt; }
    public void setAttemptedAt(LocalDateTime attemptedAt) { this.attemptedAt = attemptedAt; }
}