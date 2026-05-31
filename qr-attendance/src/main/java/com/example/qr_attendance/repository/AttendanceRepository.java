package com.example.qr_attendance.repository;

import com.example.qr_attendance.model.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    List<Attendance> findBySessionId(Long sessionId);
    boolean existsBySessionIdAndDeviceId(Long sessionId, String deviceId);
}