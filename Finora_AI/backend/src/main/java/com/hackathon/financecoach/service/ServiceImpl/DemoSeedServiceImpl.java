package com.hackathon.financecoach.service.ServiceImpl;

import com.hackathon.financecoach.entity.User;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;

/**
 * Unused placeholder. DemoSeedService is a concrete @Service (not an interface), so this class
 * cannot implement it. Kept (not registered as a bean) so no teammate code is lost.
 */
@Slf4j
public class DemoSeedServiceImpl {

  @Transactional
  public void seedUserData(User user) {
    log.info("Seeding demo data for user ID: {}", user.getId());

    // TODO: Add initial demo transactions and financial data.
  }
}
