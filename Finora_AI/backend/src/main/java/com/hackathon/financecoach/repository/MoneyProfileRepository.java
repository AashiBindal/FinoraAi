package com.hackathon.financecoach.repository;

import com.hackathon.financecoach.entity.MoneyProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MoneyProfileRepository extends JpaRepository<MoneyProfile, Long> {
  Optional<MoneyProfile> findByUserId(Long userId);
}
