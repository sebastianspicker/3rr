# 3RR browser demo

[Open the demo](https://sebastianspicker.github.io/3rr/).

This demo lets you try an alternative layout for the CS2 control panel. All servers, players, and command responses are fictional.
Actions run locally in your browser; there is no login or connection to a game
server. The current application's interface is shown in the
[README screenshot tour](../README.md#screenshot-tour).

## Try it

1. Select **Manage** beside a server to open its controls. Every server row
   leads to the same sample server.
2. Enter `status` in the Console and press Enter for a simulated response.
3. Open Players and filter the list. Player actions hide the sample row;
   Refresh restores the fixed data.
4. Explore Match and Setup, or press **Ctrl/Cmd+K** for the command palette.
   Setup controls give local feedback without changing a server.

Your theme choice is saved in local storage. Reloading resets the other
changes you make. Tabs have shareable URLs, such as `#manage/players` and
`#manage/setup`. Add server, Settings, and Users show demo notices.

## Run locally

Open `index.html` directly, or run from the repository root:

```bash
python3 -m http.server 8080 --bind 127.0.0.1 --directory design-preview
```

Visit `http://127.0.0.1:8080`. HTML, CSS, JavaScript, and fonts are served from
this directory; the demo has no CDN or backend dependencies.

## GitHub Pages

The [Pages workflow](../.github/workflows/pages.yml) checks pull requests and
publishes changes to `design-preview/` when they reach `main`. It can also be
run manually from `main`. Only the HTML, CSS, JavaScript, fonts, and font licenses are published.

For a fork, select **GitHub Actions** under **Settings → Pages → Build and
deployment → Source**, then run **Pages Demo** from the Actions tab on `main`.
Use the deployment URL reported by the workflow; update the demo and badge
links in your fork's README. See GitHub's
[custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Checks

From the repository root:

```bash
node --check design-preview/preview.js
node design-preview/verify.mjs
```

These commands check the HTML elements used by the demo, its simulated-data
notice, local assets, and font licenses. They also check that the demo code
does not use network APIs. The Pages workflow runs both commands;
`./scripts/verify.sh` checks the operational modules separately.
Before publishing, also check navigation, console feedback, player filtering,
the command palette, theme switching, and narrow-screen navigation in a browser.

## Fonts

Bundled Inter, Syne, and JetBrains Mono fonts use the SIL Open Font License.
Their notices are included in `fonts/` and published with the demo.
