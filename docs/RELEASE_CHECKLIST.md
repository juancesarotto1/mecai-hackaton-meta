# Hackathon release checklist

## Product proof

- [ ] Confirm the chosen track is Productivity.
- [ ] Confirm the New Experience division provenance and September 24, 2026 cutoff.
- [x] Run the entire mission with hands only in the IWER emulator (`iwsdk dev up`, emulated Quest 3). Evidence: `docs/evidence/xr-emulator-hands-mission.png`.
- [ ] Optionally repeat it in the desktop Meta XR Simulator.
- [ ] Run the entire mission with hands only on the target Meta Quest device.
- [ ] Confirm all controls are usable seated within a two-foot radius.
- [ ] Time a first-time user's session at ten minutes or less.
- [ ] Verify cold start, pause/resume, reset, WebXR exit, and re-entry on device. All passed in the IWER emulator.
- [ ] Profile frame rate, memory, thermals, and loading on device.

## Policy and privacy

- [ ] Re-read all linked Meta terms and policies on submission day.
- [ ] Confirm the educational disclaimer is visible and no medical/safety certification is implied.
- [ ] Confirm asset licenses and provenance.
- [ ] Confirm no personal or sensitive data is collected by the judged XR build.
- [ ] If optional cloud AI is demonstrated, disclose that prompt text leaves the device and never expose the API key.

## Build and access

- [ ] Run `pnpm quality` from a clean install.
- [x] Publish `apps/xr-experience/dist` to a public HTTPS URL: https://juancesarotto1.github.io/mecai-hackaton-meta/ (GitHub Pages via `deploy-xr.yml`; headless smoke test passed on the live URL).
- [ ] Open the final URL in the Quest browser without developer credentials.
- [ ] Test the URL from a separate account/network.
- [ ] Record the final build identifier and archive the exact source/lockfile.

## Submission

- [ ] Capture Meta device or XR Simulator footage from the final build.
- [ ] Publish a public YouTube/Vimeo video under three minutes.
- [ ] Replace every bracketed field in `SUBMISSION_DRAFT.md`.
- [ ] Submit playable URL, video URL, track, division, description, hands explanation, launch date, and team details.
- [ ] After the deadline, freeze the hosted build and keep it available throughout judging.
