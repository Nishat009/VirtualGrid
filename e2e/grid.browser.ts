import { test, expect } from '@playwright/test';

test('dataset buttons, top/bottom and scrolling show the correct serial numbers', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const grid = page.getByRole('grid', { name: 'People' });
  const rows = grid.getByRole('row').filter({ has: page.getByRole('gridcell') });
  await expect(grid).toHaveAttribute('aria-rowcount', '100001');

  for (const [label, count] of [['10k', 10_000], ['100k', 100_000], ['1M', 1_000_000], ['10k', 10_000]] as const) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(grid).toHaveAttribute('aria-rowcount', String(count + 1));
    await expect(rows.first().getByRole('gridcell').first()).toHaveText('1');
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('status')).toHaveText(`${count.toLocaleString('en-US')} rows selected.`);
    await page.getByRole('button', { name: 'Bottom', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText(`Moved to the last row (${count.toLocaleString('en-US')}).`);
    await expect(rows.last().getByRole('gridcell').first()).toHaveText(count.toLocaleString('en-US'));
    await expect(rows.last()).toBeInViewport();
    expect(await rows.count()).toBeLessThan(40);
    await page.getByRole('button', { name: 'Top', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Moved to the first row.');
    await expect(rows.first().getByRole('gridcell').first()).toHaveText('1');
    await expect(rows.first()).toBeInViewport();
  }
  await grid.evaluate(el => { el.scrollTop = 467 * 32; });
  await expect(grid.getByRole('gridcell', { name: '468', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: '1M', exact: true }).click();
  await expect(grid).toHaveAttribute('aria-rowcount', '1000001');
  await expect(rows.first().getByRole('gridcell').first()).toHaveText('1');
  await page.getByRole('button', { name: 'Bottom', exact: true }).click();
  await expect(rows.last().getByRole('gridcell').first()).toHaveText('1,000,000');
  await page.getByRole('button', { name: '10k', exact: true }).click();
  await expect(grid).toHaveAttribute('aria-rowcount', '10001');
  await expect(rows.first().getByRole('gridcell').first()).toHaveText('1');
  await page.getByRole('button', { name: 'Bottom', exact: true }).click();
  await expect(rows.last().getByRole('gridcell').first()).toHaveText('10,000');
  await expect(rows.last()).toBeInViewport();
  expect(errors).toEqual([]);
});

test('rows react to mouse and keyboard selection', async ({ page }) => {
  await page.goto('/');
  const rows = page.getByRole('grid').getByRole('row').filter({ has: page.getByRole('gridcell') });
  const first = rows.nth(0);
  const second = rows.nth(1);
  await first.click();
  await expect(first).toHaveAttribute('aria-selected', 'true');
  const selectedBackground = await first.evaluate(el => getComputedStyle(el).backgroundColor);
  await second.focus();
  await page.keyboard.press('Enter');
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(first).toHaveAttribute('aria-selected', 'false');
  expect(await second.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(selectedBackground);
  await first.focus();
  await page.keyboard.press('Space');
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await expect(second).toHaveAttribute('aria-selected', 'false');
});
