
package com.stationconnect.config;

import com.stationconnect.security.JwtAuthenticationFilter;
import com.stationconnect.security.JwtUtil;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http,
            JwtUtil jwtUtil) throws Exception {

        JwtAuthenticationFilter jwtFilter =
                new JwtAuthenticationFilter(jwtUtil);

        AuthenticationEntryPoint unauthorized =
                (request, response, ex) ->
                        response.sendError(
                                HttpStatus.UNAUTHORIZED.value(),
                                "Authentication required or token is invalid"
                        );

        AccessDeniedHandler forbidden =
                (request, response, ex) ->
                        response.sendError(
                                HttpStatus.FORBIDDEN.value(),
                                "Insufficient permissions"
                        );

        http
            // REST API security configuration
            .csrf(csrf -> csrf.disable())
            .cors(cors -> {})
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable())

            // Use stateless JWT authentication
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            // Handle unauthorized and forbidden requests
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(unauthorized)
                .accessDeniedHandler(forbidden)
            )

            // Define endpoint permissions
            .authorizeHttpRequests(auth -> auth

                // Allow browser CORS preflight requests
                .requestMatchers(HttpMethod.OPTIONS, "/**")
                    .permitAll()

                // Public endpoints
                .requestMatchers("/error")
                    .permitAll()

                .requestMatchers(
                    HttpMethod.POST,
                    "/api/auth/register",
                    "/api/auth/login"
                ).permitAll()

                .requestMatchers("/api/health")
                    .permitAll()

                // WebSocket handshake.
                // The STOMP CONNECT frame must be authenticated
                // by StompJwtChannelInterceptor.
                .requestMatchers("/ws", "/ws/**")
                    .permitAll()

                // Admin endpoints
                .requestMatchers("/api/admin/**")
                    .hasRole("ADMIN")

                // Driver endpoints
                .requestMatchers("/api/driver/**")
                    .hasAnyRole("DRIVER", "ADMIN")

                // Rider endpoints
                .requestMatchers("/api/rider/**")
                    .hasAnyRole("RIDER", "ADMIN")

                // All other endpoints require authentication
                .anyRequest()
                    .authenticated()
            )

            // Apply the JWT filter to HTTP requests
            .addFilterBefore(
                jwtFilter,
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration config = new CorsConfiguration();

        // Angular development server
        config.setAllowedOrigins(
            List.of("http://localhost:4200")
        );

        // Supported HTTP methods
        config.setAllowedMethods(
            List.of(
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS"
            )
        );

        // Supported request headers
        config.setAllowedHeaders(
            List.of(
                "Authorization",
                "Content-Type",
                "Accept"
            )
        );

        config.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", config);

        return source;
    }
}
