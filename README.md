# Codex Quota Widget for Pi

A small [Pi](https://github.com/badlogic/pi-mono) extension that displays Codex/ChatGPT usage quota information below the editor when an `openai-codex` provider is active.

The widget shows short-window and weekly-window usage percentages, progress bars, and reset estimates when the active Codex provider exposes quota data through response headers or the ChatGPT usage endpoint.

## Features

- Shows quota usage directly in the Pi UI.
- Updates from Codex response headers after provider calls.
- Provides `/codex-quota` command to manually refresh usage.
- Supports multiple Codex provider IDs matching `openai-codex`, `openai-codex-2`, `openai-codex-3`, etc.
- Keeps the last known snapshot in memory for the current session.

## Security and privacy

This extension reads your local Pi auth file at runtime:

```text
~/.pi/agent/auth.json
```

It reads the access token for the active Codex provider only so it can call the ChatGPT usage endpoint:

```text
https://chatgpt.com/backend-api/wham/usage
```

Important privacy notes:

- No token is committed to this repository.
- No token is logged by the extension.
- No token is persisted by the extension.
- The token is sent only as an `Authorization: Bearer ...` header to the ChatGPT usage endpoint above.
- The widget stores quota snapshots only in memory for the current Pi session.

As with all Pi extensions, install only after reviewing the source code. Pi extensions run with local user permissions.

## Installation

Install as a Pi package from GitHub:

```bash
pi install git:github.com/rcrohmana/codex-quota-widget
```

Or add it manually to your Pi settings:

```json
{
  "packages": [
    "git:github.com/rcrohmana/codex-quota-widget"
  ]
}
```

You can also try it temporarily:

```bash
pi -e git:github.com/rcrohmana/codex-quota-widget
```

## Usage

1. Start Pi with a Codex provider/model active.
2. The quota widget appears below the editor when the provider ID matches `openai-codex` or `openai-codex-*`.
3. Use the command below to manually refresh usage:

```text
/codex-quota
```

Example compact widget output:

```text
h:████░░ 42%(2h10m) | w:██░░░░ 18%(4d3h)
```

Legend:

- `h` = short quota window, usually hours-scale.
- `w` = weekly quota window.
- percentage = used quota percentage.
- time = estimated time until reset, when available.

## How it works

The extension combines two sources:

1. Codex response headers such as `x-codex-primary-used-percent`, `x-codex-primary-window-minutes`, and reset headers.
2. The ChatGPT usage endpoint for manual or startup refresh.

Quota windows are classified as:

- `short`: 4 to 24 hours
- `weekly`: 7 days or longer

Unknown or unsupported windows are ignored.

## Limitations

- Depends on Codex/ChatGPT response headers and usage endpoint shape, which may change.
- Only activates for provider IDs matching `openai-codex` or `openai-codex-*`.
- If auth is missing or the endpoint rejects the request, the widget keeps the last known/neutral state.
- The extension is UI-focused and does not enforce quota limits.

## Development

This is a TypeScript Pi extension loaded directly by Pi.

Package manifest:

```json
{
  "pi": {
    "extensions": ["./index.ts"]
  }
}
```

Local test:

```bash
pi -e /path/to/codex-quota-widget
```

## Acknowledgements

Thanks to the [Pi / pi-mono](https://github.com/badlogic/pi-mono) project for the extension platform.

## License

MIT License. See [LICENSE](LICENSE).
