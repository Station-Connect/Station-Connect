package com.stationconnect.controller;

import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    @GetMapping("/test")
    public Map<String, String> test() {
        return Map.of("message", "Admin access OK");
    }
}