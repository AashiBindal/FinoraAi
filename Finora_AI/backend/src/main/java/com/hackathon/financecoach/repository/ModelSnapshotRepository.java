package com.hackathon.financecoach.repository;

import com.hackathon.financecoach.entity.ModelSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ModelSnapshotRepository extends JpaRepository<ModelSnapshot, Long> {
    Optional<ModelSnapshot> findByUserId(Long userId);
    void deleteByUserId(Long userId);
}
