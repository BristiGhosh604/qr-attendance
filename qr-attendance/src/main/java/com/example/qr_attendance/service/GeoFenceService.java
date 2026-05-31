package com.example.qr_attendance.service;

import org.springframework.stereotype.Service;

@Service
public class GeoFenceService {

    private static final double EARTH_RADIUS = 6371000; // metres

    public boolean isWithinRange(double studentLat, double studentLon,
                                 double classLat, double classLon,
                                 double maxMetres) {

        double dLat = Math.toRadians(classLat - studentLat);
        double dLon = Math.toRadians(classLon - studentLon);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(studentLat))
                * Math.cos(Math.toRadians(classLat))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distance = EARTH_RADIUS * c;

        return distance <= maxMetres;
    }
}