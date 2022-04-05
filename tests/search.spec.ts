import { test, expect } from './vscodeTest';

test('search', async ({ open }) => {
  const window = await open({
    'test.txt': 'Text file content\nSecond line'
  });

  await expect(window.locator('text=test.txt')).toBeVisible();
  await window.keyboard.press('Control+Shift+F');
  await window.keyboard.type('Text');
  await expect(window.locator('text=Text file content')).toBeVisible();
  await window.locator('text=Text file content').click();
  await expect(window.locator('text=Second line')).toBeVisible();
});
