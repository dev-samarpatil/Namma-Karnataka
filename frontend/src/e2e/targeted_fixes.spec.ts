import { test, expect } from '@playwright/test';

test.describe('Namma Karnataka — Targeted Fixes Verification (Phase 10 Follow-up)', () => {

  test('Scenario A: Murudeshwar deduplication and canonical resolution', async ({ page }) => {
    await page.goto('/');

    const exploreBtn = page.locator('[data-testid="nav-tab-explore"], [data-testid="mobile-nav-tab-explore"]').locator('visible=true').first();
    if (await exploreBtn.isVisible()) {
      await exploreBtn.click();
    }

    await expect(page.getByTestId('destinations-grid')).toBeVisible({ timeout: 35000 });

    // Search for Murudeshwar
    const searchInput = page.getByRole('searchbox', { name: /Search destinations/i });
    await searchInput.fill('Murudeshwar');
    await expect(page.locator('.loading-state')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('destinations-grid')).toBeVisible();

    // Verify exactly 1 destination card appears
    const cards = page.locator('.destination-card');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText(/Murudeshwar/i);

    // Open detail modal
    const detailsBtn = cards.first().locator('button.btn-card-secondary, [data-testid^="view-details-"]').first();
    await detailsBtn.click();

    // Verify modal content opens
    const modal = page.getByTestId('destination-modal-overlay');
    await expect(modal).toBeVisible();

    // Verify hero banner is prominent (height ~270px)
    const heroBanner = page.locator('.modal-hero-banner');
    await expect(heroBanner).toBeVisible();
    const box = await heroBanner.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(200);
    }

    // Verify verified authentic badge
    await expect(heroBanner).toContainText(/Verified Authentic/i);

    // Click "Plan Trip With This"
    const planWithThisBtn = page.getByTestId('modal-plan-trip-btn');
    await expect(planWithThisBtn).toBeVisible();
    await planWithThisBtn.click();

    // Confirm navigation to Plan Trip tab
    await expect(page.getByTestId('submit-plan-button')).toBeVisible();
  });

  test('Scenario B: Belagavi Fort & Kamal Basti deduplication', async ({ page }) => {
    await page.goto('/');

    const exploreBtn = page.locator('[data-testid="nav-tab-explore"], [data-testid="mobile-nav-tab-explore"]').locator('visible=true').first();
    if (await exploreBtn.isVisible()) {
      await exploreBtn.click();
    }

    await expect(page.getByTestId('destinations-grid')).toBeVisible({ timeout: 35000 });

    const searchInput = page.getByRole('searchbox', { name: /Search destinations/i });
    await searchInput.fill('Belagavi');
    await expect(page.locator('.loading-state')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('destinations-grid')).toBeVisible();

    // Verify exactly 1 destination card appears
    const cards = page.locator('.destination-card');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText(/Belagavi Fort & Kamal Basti/i);
    await expect(cards.first()).toContainText(/Heritage/i);

    // Open detail modal and verify hero image renders
    const detailsBtn = cards.first().locator('button.btn-card-secondary, [data-testid^="view-details-"]').first();
    await detailsBtn.click();

    const modal = page.getByTestId('destination-modal-overlay');
    await expect(modal).toBeVisible();

    const heroBanner = page.locator('.modal-hero-banner');
    await expect(heroBanner).toBeVisible();

    const closeBtn = page.getByTestId('modal-close-button');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('Scenario C: Destination detail photo layout and scrolling', async ({ page }) => {
    await page.goto('/');

    const exploreBtn = page.locator('[data-testid="nav-tab-explore"], [data-testid="mobile-nav-tab-explore"]').locator('visible=true').first();
    if (await exploreBtn.isVisible()) {
      await exploreBtn.click();
    }

    await expect(page.getByTestId('destinations-grid')).toBeVisible({ timeout: 35000 });

    // Search for Bidar Fort
    const searchInput = page.getByRole('searchbox', { name: /Search destinations/i });
    await searchInput.fill('Bidar');
    await expect(page.locator('.loading-state')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('destinations-grid')).toBeVisible();

    const cards = page.locator('.destination-card');
    const detailsBtn = cards.first().locator('button.btn-card-secondary, [data-testid^="view-details-"]').first();
    await detailsBtn.click();

    const modal = page.getByTestId('destination-modal-overlay');
    await expect(modal).toBeVisible();

    // Verify hero banner dimensions and image presence
    const heroBanner = page.locator('.modal-hero-banner');
    await expect(heroBanner).toBeVisible();
    const heroImg = heroBanner.locator('img');
    await expect(heroImg).toBeVisible();

    const box = await heroBanner.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(200);
    }

    // Verify scroll area and footer buttons are intact
    const scrollArea = page.locator('.modal-scroll-area');
    await expect(scrollArea).toBeVisible();

    const footer = page.locator('.modal-footer');
    await expect(footer).toBeVisible();

    const closeBtn = page.getByTestId('modal-close-button');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('Scenario D: Kondajji Lake verified photograph display', async ({ page }) => {
    await page.goto('/');

    const exploreBtn = page.locator('[data-testid="nav-tab-explore"], [data-testid="mobile-nav-tab-explore"]').locator('visible=true').first();
    if (await exploreBtn.isVisible()) {
      await exploreBtn.click();
    }

    await expect(page.getByTestId('destinations-grid')).toBeVisible({ timeout: 35000 });

    const searchInput = page.getByRole('searchbox', { name: /Search destinations/i });
    await searchInput.fill('Kondajji');
    await expect(page.locator('.loading-state')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('destinations-grid')).toBeVisible();

    const cards = page.locator('.destination-card');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText(/Kondajji Lake/i);
    // Card displays verified authentic badge
    await expect(cards.first()).toContainText(/Verified Authentic/i);

    // Open detail modal
    const detailsBtn = cards.first().locator('button.btn-card-secondary, [data-testid^="view-details-"]').first();
    await detailsBtn.click();

    const modal = page.getByTestId('destination-modal-overlay');
    await expect(modal).toBeVisible();

    // Verify hero banner with authentic image
    const heroBanner = page.locator('.modal-hero-banner');
    await expect(heroBanner).toBeVisible();
    await expect(heroBanner.locator('img')).toBeVisible();
    await expect(heroBanner).toContainText(/Verified Authentic Photograph/i);

    const closeBtn = page.getByTestId('modal-close-button');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('Scenario E: Planner input simplification (no preset buttons, direct numeric entry)', async ({ page }) => {
    await page.goto('/');

    // Navigate to Plan tab
    const planTab = page.locator('[data-testid="nav-tab-planner"], [data-testid="mobile-nav-tab-planner"]').locator('visible=true').first();
    await planTab.click();

    // Verify duration input and controls exist
    const durationInput = page.getByTestId('planner-duration-input');
    await expect(durationInput).toBeVisible();
    const decDuration = page.getByTestId('decrease-duration-btn');
    const incDuration = page.getByTestId('increase-duration-btn');
    await expect(decDuration).toBeVisible();
    await expect(incDuration).toBeVisible();

    // Verify traveler input and controls exist
    const travelersInput = page.getByTestId('planner-travelers-input');
    await expect(travelersInput).toBeVisible();
    const decTravelers = page.getByTestId('decrease-travelers-btn');
    const incTravelers = page.getByTestId('increase-travelers-btn');
    await expect(decTravelers).toBeVisible();
    await expect(incTravelers).toBeVisible();

    // Verify redundant preset cards (1d, 2d, 3d, 1p, 2p, 4p...) are NOT present in the DOM
    await expect(page.locator('.duration-selector')).toHaveCount(0);
    await expect(page.locator('button:has-text("1d")')).toHaveCount(0);
    await expect(page.locator('button:has-text("2d")')).toHaveCount(0);
    await expect(page.locator('button:has-text("3d")')).toHaveCount(0);
    await expect(page.locator('button:has-text("1p")')).toHaveCount(0);
    await expect(page.locator('button:has-text("2p")')).toHaveCount(0);
    await expect(page.locator('button:has-text("4p")')).toHaveCount(0);

    // Test direct typing and +/- buttons
    await durationInput.fill('4');
    await expect(durationInput).toHaveValue('4');

    await incDuration.click();
    await expect(durationInput).toHaveValue('5');

    await travelersInput.fill('6');
    await expect(travelersInput).toHaveValue('6');

    await decTravelers.click();
    await expect(travelersInput).toHaveValue('5');

    // Submit plan and verify itinerary generates with entered parameters
    const submitBtn = page.getByTestId('submit-plan-button');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    const timeline = page.locator('[data-testid="itinerary-timeline"], [data-testid="day-block-1"], .timeline-container').first();
    await expect(timeline).toBeVisible({ timeout: 35000 });
  });

});
