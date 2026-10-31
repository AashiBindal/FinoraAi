package com.hackathon.financecoach.controller;

import com.hackathon.financecoach.dto.Request.GoalContributionRequest;
import com.hackathon.financecoach.dto.Request.GoalRequest;
import com.hackathon.financecoach.dto.Response.GoalResponse;
import com.hackathon.financecoach.dto.Response.GoalSummaryResponse;
import com.hackathon.financecoach.model.GoalCategory;
import com.hackathon.financecoach.model.GoalStatus;
import com.hackathon.financecoach.security.UserPrincipal;
import com.hackathon.financecoach.service.GoalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/goals")
@RequiredArgsConstructor
public class GoalController {

  private final GoalService goalService;

  @PostMapping
  public ResponseEntity<GoalResponse> createGoal(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @Valid @RequestBody GoalRequest request) {
    GoalResponse response = goalService.createGoal(currentUser.getId(), request);
    return new ResponseEntity<>(response, HttpStatus.CREATED);
  }

  @GetMapping
  public ResponseEntity<Page<GoalResponse>> getGoals(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @RequestParam(required = false) GoalStatus status,
    @RequestParam(required = false) GoalCategory category,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size,
    @RequestParam(defaultValue = "targetDate") String sortBy,
    @RequestParam(defaultValue = "ASC") String direction) {

    Sort sort = Sort.by(Sort.Direction.fromString(direction), sortBy);
    Pageable pageable = PageRequest.of(page, size, sort);

    Page<GoalResponse> response = goalService.getFilteredGoals(currentUser.getId(), status, category, pageable);
    return ResponseEntity.ok(response);
  }

  @GetMapping("/{id}")
  public ResponseEntity<GoalResponse> getGoalById(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @PathVariable Long id) {
    GoalResponse response = goalService.getGoalById(currentUser.getId(), id);
    return ResponseEntity.ok(response);
  }

  @PutMapping("/{id}")
  public ResponseEntity<GoalResponse> updateGoal(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @PathVariable Long id,
    @Valid @RequestBody GoalRequest request) {
    GoalResponse response = goalService.updateGoal(currentUser.getId(), id, request);
    return ResponseEntity.ok(response);
  }

  @PostMapping("/{id}/contribute")
  public ResponseEntity<GoalResponse> addContribution(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @PathVariable Long id,
    @Valid @RequestBody GoalContributionRequest request) {
    GoalResponse response = goalService.addContribution(currentUser.getId(), id, request);
    return ResponseEntity.ok(response);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deleteGoal(
    @AuthenticationPrincipal UserPrincipal currentUser,
    @PathVariable Long id) {
    goalService.deleteGoal(currentUser.getId(), id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/summary")
  public ResponseEntity<GoalSummaryResponse> getGoalSummary(
    @AuthenticationPrincipal UserPrincipal currentUser) {
    GoalSummaryResponse response = goalService.getGoalSummary(currentUser.getId());
    return ResponseEntity.ok(response);
  }
}
