package com.example.qr_attendance.repository;

import com.example.qr_attendance.model.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findByQrTokenAndIsActiveTrue(String qrToken);
    List<Session> findByTeacherId(Long teacherId);
}