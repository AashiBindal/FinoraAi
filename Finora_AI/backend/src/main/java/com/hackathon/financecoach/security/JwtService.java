package com.hackathon.financecoach.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(JwtService.class);

    /** Set via the JWT_SECRET environment variable (min. 32 characters). No secret is hardcoded. */
    @Value("${jwt.secret:}")
    private String secretKey;

    private SecretKey signingKey;

    @Value("${jwt.expiration-ms:86400000}")
    private long jwtExpirationMs;

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(getSignInKey())
                .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private synchronized SecretKey getSignInKey() {
        if (signingKey == null) {
            if (secretKey == null || secretKey.isBlank()) {
                // Dev convenience only: tokens become invalid when the server restarts.
                log.warn("JWT_SECRET is not set - using a random per-process signing key. Set JWT_SECRET for stable sessions.");
                byte[] random = new byte[64];
                new java.security.SecureRandom().nextBytes(random);
                signingKey = Keys.hmacShaKeyFor(random);
            } else {
                byte[] keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
                if (keyBytes.length < 32) {
                    throw new IllegalStateException("JWT_SECRET must be at least 32 characters (256 bits) long.");
                }
                signingKey = Keys.hmacShaKeyFor(keyBytes);
            }
        }
        return signingKey;
    }
}
