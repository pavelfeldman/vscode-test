import { test as baseTest, _electron, Page, ElectronApplication } from '@playwright/test';

import fs from 'fs';
import path from 'path';

export { expect } from '@playwright/test';

const VSCODE_SRC = '/home/pfeldman/code/vscode';

export const test = baseTest.extend<{
  open: (workspace: { [key: string]: string }) => Promise<Page>,
}>({
    open: async ({ trace }, use, testInfo) => {
    let electronApp: ElectronApplication;
    const enableTracing = trace === 'on' || (testInfo.retry && trace === 'retain-on-failure');

    await use(async workspace => {
      // Generate workspace based on user's data.
      const workspaceDir = testInfo.outputPath('workspace');
      await fs.promises.mkdir(workspaceDir, { recursive: true });
      await fs.promises.writeFile(path.join(workspaceDir, 'package.json'), JSON.stringify({
        main: path.join(VSCODE_SRC, 'out/main.js')
      }));
      for (const [file, content] of Object.entries(workspace)) {
        await fs.promises.mkdir(path.dirname(path.join(workspaceDir, file)), { recursive: true });
        await fs.promises.writeFile(path.join(workspaceDir, file), content);
      }

      // Start Electron.
      const userDataDir = testInfo.outputPath('.profile');
      electronApp = await _electron.launch({
        executablePath: path.join(VSCODE_SRC, '.build/electron/code-oss'),
        args: [
            workspaceDir,
            '--skip-release-notes',
            '--skip-welcome',
            '--disable-telemetry',
            '--no-cached-data',
            '--disable-updates',
            '--disable-keytar',
            '--disable-crash-reporter',
            '--disable-workspace-trust',
            `--user-data-dir=${userDataDir}`,
            '--disable-gpu',
            '--enable-proposed-api=vscode.vscode-notebook-tests',
            '--enable-smoke-test-driver',
            'true'
      ]});

      // FIXME(upstream): throttle Electron window creation to enable tracing early.
      if (enableTracing) {
        await electronApp.context().tracing.start({
            screenshots: true,
            snapshots: true,
            sources: true });
      }
      return electronApp.firstWindow();
    });

    // After the test, stop tracing and close the app.
    if (enableTracing)
      await electronApp.context().tracing.stop({ path: testInfo.outputPath('trace.zip') });
    await electronApp.close();
  }
});
