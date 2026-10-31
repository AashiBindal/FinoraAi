package com.hackathon.financecoach.service;

import com.hackathon.financecoach.entity.Budget;
import com.hackathon.financecoach.entity.FinancialGoal;
import com.hackathon.financecoach.entity.Transaction;
import com.hackathon.financecoach.entity.User;
import com.hackathon.financecoach.model.GoalCategory;
import com.hackathon.financecoach.model.GoalStatus;
import com.hackathon.financecoach.model.RiskPreference;
import com.hackathon.financecoach.model.TransactionCategory;
import com.hackathon.financecoach.model.TransactionType;
import com.hackathon.financecoach.repository.BudgetRepository;
import com.hackathon.financecoach.repository.FinancialGoalRepository;
import com.hackathon.financecoach.repository.TransactionRepository;
import com.hackathon.financecoach.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DemoSeedService {

    private final UserRepository userRepo;
    private final TransactionRepository txRepo;
    private final BudgetRepository budgetRepo;
    private final FinancialGoalRepository goalRepo;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public User seedDefaultDemoUser() {
        String email = "demo@finance.com";
        User user = userRepo.findByEmail(email).orElse(null);

        if (user == null) {
            log.info("Creating default demo user: {}", email);
            user = User.builder()
                    .fullName("Rohan Sharma")
                    .email(email)
                    .passwordHash(passwordEncoder.encode("Demo@1234"))
                    .currency("INR")
                    .monthlyIncomeTarget(new BigDecimal("85000.00"))
                    .savingsGoalPercent(new BigDecimal("30.00"))
                    .riskPreference(RiskPreference.MEDIUM)
                    .financialGoalsText("Build 6 months emergency cushion and buy MacBook Pro M3")
                    .build();
            user = userRepo.save(user);
        }

        seedUserData(user);
        return user;
    }

    @Transactional
    public void seedUserData(User user) {
        log.info("Seeding 4 months of realistic Indian financial data for user: {}", user.getEmail());

        LocalDate now = LocalDate.now();

        // 1. Budgets for Current Month (Food budget deliberately exceeded, Rent budget OK)
        LocalDate curMonth = now.withDayOfMonth(1);

        if (!budgetRepo.existsByUserIdAndMonthAndCategory(user.getId(), curMonth, TransactionCategory.FOOD)) {
            budgetRepo.save(Budget.builder()
                    .user(user)
                    .month(curMonth)
                    .category(TransactionCategory.FOOD)
                    .limitAmount(new BigDecimal("12000.00")) // will be exceeded (~15,500 spent)
                    .build());
        }

        if (!budgetRepo.existsByUserIdAndMonthAndCategory(user.getId(), curMonth, TransactionCategory.RENT)) {
            budgetRepo.save(Budget.builder()
                    .user(user)
                    .month(curMonth)
                    .category(TransactionCategory.RENT)
                    .limitAmount(new BigDecimal("25000.00")) // OK (22,000 spent)
                    .build());
        }

        if (!budgetRepo.existsByUserIdAndMonthAndCategory(user.getId(), curMonth, null)) {
            budgetRepo.save(Budget.builder()
                    .user(user)
                    .month(curMonth)
                    .category(null) // Overall monthly budget
                    .limitAmount(new BigDecimal("60000.00"))
                    .build());
        }

        // 2. Financial Goals
        if (goalRepo.findByUserIdOrderByTargetDateAsc(user.getId()).isEmpty()) {
            goalRepo.saveAll(List.of(
                    FinancialGoal.builder()
                            .user(user)
                            .title("Emergency Fund Buffer")
                            .category(GoalCategory.EMERGENCY_FUND)
                            .priority("HIGH")
                            .targetAmount(new BigDecimal("250000.00"))
                            .currentAmount(new BigDecimal("180000.00"))
                            .targetDate(now.plusMonths(5))
                            .status(GoalStatus.ACTIVE)
                            .build(),
                    FinancialGoal.builder()
                            .user(user)
                            .title("MacBook Pro M3")
                            .category(GoalCategory.OTHER)
                            .priority("MEDIUM")
                            .targetAmount(new BigDecimal("170000.00"))
                            .currentAmount(new BigDecimal("75000.00"))
                            .targetDate(now.plusMonths(8))
                            .status(GoalStatus.ACTIVE)
                            .build()
            ));
        }

        // 3. Transactions across 4 months (M-3, M-2, M-1, Current Month)
        List<Transaction> txList = new ArrayList<>();

        for (int m = 3; m >= 0; m--) {
            LocalDate baseDate = now.minusMonths(m);
            int year = baseDate.getYear();
            int month = baseDate.getMonthValue();

            // Salary: ₹85,000 on 1st of month
            txList.add(Transaction.builder()
                    .user(user)
                    .type(TransactionType.INCOME)
                    .amount(new BigDecimal("85000.00"))
                    .category(TransactionCategory.SALARY)
                    .title("Monthly Tech Salary Credit")
                    .transactionDate(LocalDate.of(year, month, 1))
                    .build());

            // Rent: ₹22,000 on 2nd of month
            txList.add(Transaction.builder()
                    .user(user)
                    .type(TransactionType.EXPENSE)
                    .amount(new BigDecimal("22000.00"))
                    .category(TransactionCategory.RENT)
                    .title("Apartment Rent Payment to Landlord")
                    .transactionDate(LocalDate.of(year, month, 2))
                    .build());

            // Groceries (D-Mart & Blinkit): ~₹7,500
            txList.add(Transaction.builder()
                    .user(user)
                    .type(TransactionType.EXPENSE)
                    .amount(new BigDecimal("5200.00"))
                    .category(TransactionCategory.FOOD)
                    .title("D-Mart Monthly Supermarket Groceries")
                    .transactionDate(LocalDate.of(year, month, 4))
                    .build());
            txList.add(Transaction.builder()
                    .user(user)
                    .type(TransactionType.EXPENSE)
                    .amount(new BigDecimal("2300.00"))
                    .category(TransactionCategory.FOOD)
                    .title("Blinkit Instant Groceries & Essentials")
                    .transactionDate(LocalDate.of(year, month, 12))
                    .build());

            // Food delivery (Swiggy / Zomato) - Intentionally high (~₹8,200) to trigger AI coaching insights
            txList.add(Transaction.builder()
                    .user(user)
                    .type(TransactionType.EXPENSE)
                    .amount(new BigDecimal("1450.00"))
                    .category(TransactionCategory.FOOD)
                    .title("Swiggy Weekend Dinner Delivery")
                    .transactionDate(LocalDate.of(year, month, 6))
                    .build());
            txList.add(Transaction.builder()
                    .user(user)
                    .type(TransactionType.EXPENSE)
                    .amount(new BigDecimal("1850.00"))
                    .category(TransactionCategory.FOOD)
                    .title("Zomato Gourmet Italian Feast")
                    .transactionDate(LocalDate.of(year, month, 14))
                    .build());
            txList.add(Transaction.builder()
                    .user(user)
                    .type(TransactionType.EXPENSE)
                    .amount(new BigDecimal("2100.00"))
                    .category(TransactionCategory.FOOD)
                    .title("Swiggy Biryani Party Order")
                    .transactionDate(LocalDate.of(year, month, 20))
                    .build());
            txList.add(Transaction.builder()
                    .user(user)
                    .type(TransactionType.EXPENSE)
                    .amount(new BigDecimal("2800.00"))
                    .category(TransactionCategory.FOOD)
                    .title("Zomato Weekend Dinners & Desserts")
                    .transactionDate(LocalDate.of(year, month, 26))
                    .build());

            // Utilities: Electricity (BESCOM) + Broadband (ACT Fibernet) ~₹3,200
            txList.add(Transaction.builder()
                    .user(user)
                    .type(TransactionType.EXPENSE)
                    .amount(new BigDecimal("1850.00"))
                    .category(TransactionCategory.UTILITIES)
                    .title("BESCOM Electricity Bill")
                    .transactionDate(LocalDate.of(year, month, 10))
                    .build());
            txList.add(Transaction.builder()
                    .user(user)
                    .type(TransactionType.EXPENSE)
                    .amount(new BigDecimal("1179.00"))
                    .category(TransactionCategory.UTILITIES)
                    .title("ACT Fibernet High Speed Broadband")
                    .transactionDate(LocalDate.of(year, month, 11))
                    .build());

            // Subscriptions: Netflix, Spotify, Cult.fit Gym ~₹2,268
            txList.add(Transaction.builder()
                    .user(user)
                    .type(TransactionType.EXPENSE)
                    .amount(new BigDecimal("649.00"))
                    .category(TransactionCategory.SUBSCRIPTIONS)
                    .title("Netflix 4K Premium Plan")
                    .transactionDate(LocalDate.of(year, month, 5))
                    .build());
            txList.add(Transaction.builder()
                    .user(user)
                    .type(TransactionType.EXPENSE)
                    .amount(new BigDecimal("119.00"))
                    .category(TransactionCategory.SUBSCRIPTIONS)
                    .title("Spotify Individual Monthly Subscription")
                    .transactionDate(LocalDate.of(year, month, 15))
                    .build());
            txList.add(Transaction.builder()
                    .user(user)
                    .type(TransactionType.EXPENSE)
                    .amount(new BigDecimal("1500.00"))
                    .category(TransactionCategory.SUBSCRIPTIONS)
                    .title("Cult.fit Elite Monthly Membership")
                    .transactionDate(LocalDate.of(year, month, 18))
                    .build());

            // Transportation: Uber & Fuel ~₹3,800
            txList.add(Transaction.builder()
                    .user(user)
                    .type(TransactionType.EXPENSE)
                    .amount(new BigDecimal("2400.00"))
                    .category(TransactionCategory.TRANSPORT)
                    .title("Uber Commutes across week")
                    .transactionDate(LocalDate.of(year, month, 16))
                    .build());
            txList.add(Transaction.builder()
                    .user(user)
                    .type(TransactionType.EXPENSE)
                    .amount(new BigDecimal("1400.00"))
                    .category(TransactionCategory.TRANSPORT)
                    .title("HP Fuel Auto Fill")
                    .transactionDate(LocalDate.of(year, month, 22))
                    .build());

            // SIP Investment: ₹10,000 on 10th
            txList.add(Transaction.builder()
                    .user(user)
                    .type(TransactionType.EXPENSE)
                    .amount(new BigDecimal("10000.00"))
                    .category(TransactionCategory.INVESTMENT)
                    .title("Mutual Fund SIP Index Fund 50")
                    .transactionDate(LocalDate.of(year, month, 10))
                    .build());

            // Occasional Shopping Spike
            if (m == 1 || m == 0) {
                txList.add(Transaction.builder()
                        .user(user)
                        .type(TransactionType.EXPENSE)
                        .amount(new BigDecimal("4500.00"))
                        .category(TransactionCategory.SHOPPING)
                        .title("Amazon Tech Accessories & Shoes")
                        .transactionDate(LocalDate.of(year, month, 19))
                        .build());
            }
        }

        txRepo.saveAll(txList);
        log.info("Saved {} historical transactions.", txList.size());

        // Refresh Living Money Model
        eventPublisher.publishEvent(new LivingMoneyModelService.ModelRefreshEvent(user.getId()));
    }
}
