import { test, expect } from '@playwright/test';

test.describe('Page d\'accueil', () => {
  test('affiche la page d\'accueil correctement', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier le titre
    await expect(page).toHaveTitle(/Webisafe/);
    
    // Vérifier que le formulaire de scan est présent
    const scanInput = page.locator('input[placeholder*="https://"]');
    await expect(scanInput).toBeVisible();
    
    // Vérifier le bouton de scan
    const scanButton = page.locator('button').filter({ hasText: /Scanner/i });
    await expect(scanButton).toBeVisible();
  });

  test('permet de lancer un scan avec une URL valide', async ({ page }) => {
    await page.goto('/');
    
    // Remplir le formulaire
    const scanInput = page.locator('input[placeholder*="https://"]');
    await scanInput.fill('https://example.com');
    
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('test@example.com');
    
    // Cliquer sur le bouton de scan
    const scanButton = page.locator('button').filter({ hasText: /Scanner/i });
    await scanButton.click();
    
    // Vérifier la navigation vers la page d'analyse
    await expect(page).toHaveURL(/\/analyse/);
  });

  test('affiche une erreur pour une URL invalide', async ({ page }) => {
    await page.goto('/');
    
    // Remplir avec une URL invalide
    const scanInput = page.locator('input[placeholder*="https://"]');
    await scanInput.fill('not-a-valid-url');
    
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('test@example.com');
    
    // Cliquer sur le bouton de scan
    const scanButton = page.locator('button').filter({ hasText: /Scanner/i });
    await scanButton.click();
    
    // Vérifier qu'un message d'erreur s'affiche
    const errorMessage = page.locator('text=/URL invalide/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('navigation vers les pages principales', async ({ page }) => {
    await page.goto('/');
    
    // Vérifier le lien vers Tarifs
    const tarifsLink = page.locator('a').filter({ hasText: /Tarifs/i });
    await tarifsLink.click();
    await expect(page).toHaveURL(/\/tarifs/);
    
    // Retour à l'accueil
    await page.goto('/');
    
    // Vérifier le lien vers Contact
    const contactLink = page.locator('a').filter({ hasText: /Contact/i });
    await contactLink.click();
    await expect(page).toHaveURL(/\/contact/);
  });
});
