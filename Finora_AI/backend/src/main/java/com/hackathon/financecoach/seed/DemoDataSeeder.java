package com.hackathon.financecoach.seed;

import com.hackathon.financecoach.repository.UserRepository;
import com.hackathon.financecoach.service.DemoSeedService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DemoDataSeeder implements CommandLineRunner {

    private final DemoSeedService demoSeedService;
    private final UserRepository userRepo;

    @Value("${app.seed.enabled:true}")
    private boolean seedEnabled;

    @Override
    public void run(String... args) {
        if (!seedEnabled) {
            log.info("Demo seeding is disabled by configuration (app.seed.enabled=false).");
            return;
        }

        if (userRepo.count() == 0) {
            log.info("Database is empty. Automatically bootstrapping demo account: demo@finance.com / Demo@1234");
            demoSeedService.seedDefaultDemoUser();
            log.info("Demo account and 4 months of financial ledger bootstrapped successfully!");
        } else {
            log.info("Existing database records detected ({} users). Skipping startup seed.", userRepo.count());
        }
    }
}
