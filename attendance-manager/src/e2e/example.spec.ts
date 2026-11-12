import { test, expect } from '@playwright/test';

test('navigating to Meetings work', async ({ page }) => {
  // Give link
  await page.goto('https://senate.northeasternsga.com/homepage');

  // Fill in credentials
  await page.getByLabel('Email Address').fill('sgaADMIN@northeastern.edu');
  await page.getByLabel('Password').fill('password');

  // Click login
  await page.locator('form').getByRole('button', { name: 'Sign In', exact: true }).click();

  // Click on Meetings
  await page.getByRole('button', { name: 'Meetings', exact: true }).click();

  // Verify page has Meetings header
  await expect(page.getByRole('heading', { name: 'Meetings', exact: true })).toBeVisible();
});

