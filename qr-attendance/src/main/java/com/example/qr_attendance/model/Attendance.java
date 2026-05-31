package com.example.qr_attendance.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance")
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "session_id")
    private Session session;

    @ManyToOne
    @JoinColumn(name = "student_id")
    private User student;

    private LocalDateTime scannedAt = LocalDateTime.now();
    private Double studentLat;
    private Double studentLng;
    private String deviceId;

    @Enumerated(EnumType.STRING)
    private Status status = Status.PRESENT;

    public enum Status {
        PRESENT, REJECTED
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Session getSession() { return session; }
    public void setSession(Session session) { this.session = session; }

    public User getStudent() { return student; }
    public void setStudent(User student) { this.student = student; }

    public LocalDateTime getScannedAt() { return scannedAt; }
    public void setScannedAt(LocalDateTime scannedAt) { this.scannedAt = scannedAt; }

    public Double getStudentLat() { return studentLat; }
    public void setStudentLat(Double studentLat) { this.studentLat = studentLat; }

    public Double getStudentLng() { return studentLng; }
    public void setStudentLng(Double studentLng) { this.studentLng = studentLng; }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
}