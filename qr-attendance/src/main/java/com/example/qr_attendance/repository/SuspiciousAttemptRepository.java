package com.example.qr_attendance.repository;

import com.example.qr_attendance.model.SuspiciousAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SuspiciousAttemptRepository extends JpaRepository<SuspiciousAttempt, Long> {
    List<SuspiciousAttempt> findBySessionId(Long sessionId);
}