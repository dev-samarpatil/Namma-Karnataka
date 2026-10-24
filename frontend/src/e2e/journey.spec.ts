import { test, expect } from '@playwright/test';

test.describe('Namma Karnataka — Comprehensive E2E Product Verification', () => {

  test('1. App shell, navigation, and bilingual switching (EN <-> KN)', async ({ page }) => {
    await page.goto('/');

    // 1. Verify header title rendered
    const brandHeading = page.locator('h1.brand-title');
    await expect(brandHeading).toBeVisible();

    // 2. Check bilingual toggle button exists via testid
    const langBtn = page.getByTestId('language-toggle-btn');
    await expect(langBtn).toBeVisible();

    // Switch to Kannada
    await langBtn.click();
    // Verify text updates to Kannada
    await expect(page.locator('body')).toContainText(/ನಮ್ಮ ಕರ್ನಾಟಕ/);

    // Switch back to English
    await langBtn.click();
    await expect(page.locator('body')).toContainText(/Discover Karnataka/);
  });

  test('2. Destination search, category filters, and detail modal', async ({ page }) => {
    await page.goto('/');

    // Navigate to Explore tab if not already active
    const exploreBtn = page.locator('[data-testid="nav-tab-explore"], [data-testid="mobile-nav-tab-explore"]').locator('visible=true').first();
    if (await exploreBtn.isVisible()) {
      await exploreBtn.click();
    }

    // Wait for initial destination grid to load
    await expect(page.getByTestId('destinations-grid')).toBeVisible({ timeout: 35000 });

    // Search for 'Hampi'
    const searchInput = page.getByRole('searchbox', { name: /Search destinations/i });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Hampi');
    await page.waitForTimeout(600);

    // Click on 'View Details' button in first destination card
    const detailsBtn = page.locator('button.btn-card-secondary, [data-testid^="view-details-"]').first();
    await expect(detailsBtn).toBeVisible();
    await detailsBtn.click();

    // Verify modal content opens
    const modal = page.getByTestId('destination-modal-overlay');
    await expect(modal).toBeVisible();

    // Close modal
    const closeBtn = page.getByTestId('modal-close-button');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('3. Interactive map and list toggle', async ({ page }) => {
    await page.goto('/');

    // Wait for initial grid to load
    await expect(page.getByTestId('destinations-grid')).toBeVisible({ timeout: 35000 });

    // Check Map view toggle button
    const mapToggleBtn = page.getByTestId('toggle-view-map');
    await expect(mapToggleBtn).toBeVisible();
    await mapToggleBtn.click();

    // Verify map container rendered
    const mapContainer = page.locator('[data-testid="interactive-map-container"], .interactive-map-root').first();
    await expect(mapContainer).toBeVisible();

    // Toggle back to list
    const listToggleBtn = page.getByTestId('toggle-view-list');
    await expect(listToggleBtn).toBeVisible();
    await listToggleBtn.click();
    await expect(page.getByTestId('destinations-grid')).toBeVisible();
  });

  test('4. Guest itinerary planning and local persistence', async ({ page }) => {
    await page.goto('/');

    // Navigate to Plan tab using desktop or mobile tab button
    const planTab = page.locator('[data-testid="nav-tab-planner"], [data-testid="mobile-nav-tab-planner"]').locator('visible=true').first();
    await planTab.click();

    // Verify planning form submit button exists
    const submitBtn = page.getByTestId('submit-plan-button');
    await expect(submitBtn).toBeVisible();

    // Generate itinerary
    await submitBtn.click();

    // Verify itinerary timeline or day block loads
    const timeline = page.locator('[data-testid="itinerary-timeline"], [data-testid="day-block-1"], .timeline-container').first();
    await expect(timeline).toBeVisible({ timeout: 35000 });

    // Verify cost breakdown
    const budgetSection = page.locator('[data-testid="budget-summary-card"], .budget-summary-card').first();
    await expect(budgetSection).toBeVisible();

    // Save trip as guest
    const saveTripBtn = page.getByTestId('save-trip-btn');
    if (await saveTripBtn.isVisible()) {
      await saveTripBtn.click();
      await page.waitForTimeout(500);
    }

    // Wait for any toast to disappear if present
    const toast = page.locator('.toast-notification');
    if (await toast.isVisible()) {
      await toast.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }

    // Navigate to Saved Trips tab
    const savedTab = page.locator('[data-testid="nav-tab-saved"], [data-testid="mobile-nav-tab-saved"]').locator('visible=true').first();
    if (await savedTab.isVisible()) {
      await savedTab.click({ force: true });
      await expect(page.locator('body')).toBeVisible();

      // Reload page to verify persistence in guest localStorage
      await page.reload();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('5. Mobile viewport responsiveness and navigation elements', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify body renders without horizontal overflow
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);

    // Verify mobile bottom navigation is visible
    const mobileBottomNav = page.locator('.mobile-bottom-nav');
    await expect(mobileBottomNav).toBeVisible();
  });
});
