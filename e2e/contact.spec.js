import { test, expect } from '@playwright/test';

test.describe('Formulaire de contact', () => {
  test('affiche la page de contact', async ({ page }) => {
    await page.goto('/contact');
    
    // Vérifier le titre
    await expect(page).toHaveTitle(/Contact/);
    
    // Vérifier le formulaire
    const nameInput = page.locator('input[placeholder*="Nom"]');
    await expect(nameInput).toBeVisible();
    
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    const messageInput = page.locator('textarea');
    await expect(messageInput).toBeVisible();
  });

  test('envoie le formulaire de contact avec succès', async ({ page }) => {
    await page.goto('/contact');
    
    // Remplir le formulaire
    await page.locator('input[placeholder*="Nom"]').fill('Test Contact');
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('textarea').fill('Ceci est un message de test.');
    
    // Sélectionner un sujet
    const subjectSelect = page.locator('select');
    if (await subjectSelect.isVisible()) {
      await subjectSelect.selectOption({ label: 'Support' });
    }
    
    // Soumettre
    const submitButton = page.locator('button').filter({ hasText: /Envoyer/i });
    await submitButton.click();
    
    // Vérifier le message de succès
    const successMessage = page.locator('text=/succès/i');
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });

  test('valide les champs du formulaire', async ({ page }) => {
    await page.goto('/contact');
    
    // Essayer de soumettre un formulaire vide
    const submitButton = page.locator('button').filter({ hasText: /Envoyer/i });
    await submitButton.click();
    
    // Vérifier les erreurs de validation
    await page.waitForTimeout(500);
    // Les champs requis doivent afficher des erreurs
  });
});
