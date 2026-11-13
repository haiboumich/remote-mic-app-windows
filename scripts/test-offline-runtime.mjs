import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const tauriConfig = JSON.parse(read("src-tauri/tauri.conf.json"));
assert.equal(tauriConfig.bundle.createUpdaterArtifacts, undefined, "offline builds must not create updater artifacts");
assert.equal(tauriConfig.plugins?.updater, undefined, "offline builds must not configure an updater endpoint");
assert.equal(tauriConfig.bundle.windows.webviewInstallMode.type, "offlineInstaller", "the installer must carry an offline WebView2 runtime");

const manifest = read("src-tauri/Cargo.toml");
for (const dependency of ["reqwest", "quick-xml", "rustls", "tauri-plugin-updater", "tauri-plugin-opener"]) {
  assert.equal(manifest.includes(dependency), false, `offline app must not depend on ${dependency}`);
}

const app = read("src-tauri/src/lib.rs");
for (const forbidden of ["mod recommendations;", "mod updater;", "tauri_plugin_updater", "tauri_plugin_opener"]) {
  assert.equal(app.includes(forbidden), false, `offline app must not compile ${forbidden}`);
}

assert.equal(read("src/navigation.ts").includes("recommendations"), false, "offline app must not expose the remote recommendations page");
assert.equal(read("src-tauri/windows/installer-hooks.nsh").includes('ExecShell "open" "http'), false, "offline installer must not launch a website");
assert.equal(read("src-tauri/capabilities/default.json").includes("opener:"), false, "offline app must not grant URL-opening permission");
assert.equal(read("src/lib/bridge.ts").includes("window.open("), false, "offline app must not open websites from the frontend");
assert.equal(read("src/pages/MacrosPage.vue").includes('"open_url",'), false, "offline app must not offer URL macro steps");
assert.match(
  read("crates/sayall-windows/src/macro_runtime.rs"),
  /MacroAction::OpenUrl\s*=>\s*StepRun::Outcome\(StepOutcome::Failed\)/,
  "legacy URL macro data must be rejected rather than sent to a browser",
);
for (const removedSource of [
  "src-tauri/src/updater.rs",
  "src-tauri/src/recommendations.rs",
  "src/lib/app-update.ts",
  "src/pages/RecommendationsPage.vue",
]) {
  assert.equal(existsSync(new URL(`../${removedSource}`, import.meta.url)), false, `${removedSource} must not be shipped`);
}
