import { getBrowserStatus } from './browser-settings.js';
import { homeDirectory } from './config.js';

export async function getDoctorReport({ packageInfo }) {
  const nodeMajor = Number.parseInt(process.versions.node.split('.')[0], 10);
  let playwrightInstalled;
  try { await import('playwright'); playwrightInstalled = true; }
  catch { playwrightInstalled = false; }
  const browserStatus = getBrowserStatus();
  return {
    cli: { name: packageInfo.name, version: packageInfo.version },
    node: { version: process.versions.node, ok: nodeMajor >= 20, minimumMajor: 20 },
    platform: { os: process.platform, arch: process.arch },
    home: { path: homeDirectory() },
    profile: { path: browserStatus.selected.profilePath },
    playwright: { installed: playwrightInstalled },
    browser: { ...browserStatus, channel: browserStatus.selected.channel ?? 'chromium', profileMode: 'persistent' }
  };
}
