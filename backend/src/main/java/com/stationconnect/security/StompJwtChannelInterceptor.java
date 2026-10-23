
package com.stationconnect.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

import java.util.List;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

@Component
public class StompJwtChannelInterceptor implements ChannelInterceptor {

    private static final String RIDE_REQUEST_DESTINATION =
            "/user/queue/ride-requests";

    private final JwtUtil jwtUtil;

    public StompJwtChannelInterceptor(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public Message<?> preSend(
            Message<?> message,
            MessageChannel channel) {

        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(
                        message, StompHeaderAccessor.class);

        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();

        if (command == StompCommand.CONNECT) {
            return authenticateConnection(message, accessor);
        }

        if (command == StompCommand.SUBSCRIBE) {
            if (accessor.getUser() == null
                    || accessor.getUser().getName() == null
                    || !RIDE_REQUEST_DESTINATION.equals(
                            accessor.getDestination())) {
                return null;
            }

            return message;
        }

        // This feature only needs server-to-client messages.
        // Do not allow clients to publish arbitrary STOMP messages.
        if (command == StompCommand.SEND) {
            return null;
        }

        return message;
    }

    private Message<?> authenticateConnection(
            Message<?> message,
            StompHeaderAccessor accessor) {

        String header =
                accessor.getFirstNativeHeader("Authorization");

        if (header == null || !header.startsWith("Bearer ")) {
            return null;
        }

        String token = header.substring(7).trim();

        try {
            Claims claims = jwtUtil.parse(token);

            String email = claims.getSubject();
            String role = claims.get("role", String.class);

            if (email == null || email.isBlank()
                    || role == null
                    || !List.of("RIDER", "DRIVER", "ADMIN")
                            .contains(role)) {
                return null;
            }

            accessor.setUser(
                    new UsernamePasswordAuthenticationToken(
                            email,
                            null,
                            List.of(new SimpleGrantedAuthority(
                                    "ROLE_" + role))
                    )
            );

            return message;

        } catch (JwtException | IllegalArgumentException ex) {
            return null;
        }
    }
}
