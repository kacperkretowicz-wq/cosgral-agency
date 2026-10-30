# COSGRAL service cards

The first approved editorial concept with the original smaller category labels.
Illustrations are optimized WebP artwork extracted from the approved generated design; category labels, links, discipline tags and arrows remain live HTML/SVG. All six illustrations total approximately 190 KB. The existing entrance, pointer parallax and service expansion interactions are retained. Artwork motion pauses outside the viewport and with reduced-motion preferences. Narrow phones use one column; wider screens use two or three.

## Preview

![Desktop service grid](services-desktop.png)

[Mobile preview](services-mobile.png)

## Chrome effects and media

Desktop mouse/trackpad devices enable full motion by default, including when Windows requests reduced motion. `?forceMotion` explicitly enables the same mode on other devices; `?reduceMotion` always takes precedence and disables motion and automatic video playback. Touch devices otherwise follow the system preference.

Cards gently enlarge and lift on hover/focus; existing entrance, parallax and click-to-expand behavior remains. Portfolio video is muted and inline, loads in view and pauses offscreen. If the browser denies autoplay, native playback controls appear and a user gesture retries it.

The decorative branch transition has been removed. SEO retains the shared service-title typography.

## Run and verify

From the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory designkopia/cosgral-agency
```

In a second terminal:

```sh
node scripts/check-service-cards.mjs
node scripts/check-service-interactions.mjs
node scripts/check-chrome-effects.mjs
```

These browser checks use the repository's existing Puppeteer package and `/usr/bin/chromium`. They verify labels/layout, hover and pointer motion, expansion/Escape, all four videos actually decoding and advancing, and explicit reduced-motion behavior. They isolate the UI from GPU rendering. A separate Chromium run with SwiftShader also confirmed rendered frames from both the hero cube and ambient WebGL background; this is not a physical GPU performance measurement.
