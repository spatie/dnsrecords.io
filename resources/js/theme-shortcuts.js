/**
 * Commands that open another theme go straight to that theme's home page,
 * which is cached at the edge, instead of asking the app for a redirect.
 */
export function switchTheme(command) {
    const shortcutsElement = document.getElementById('theme-shortcuts');

    if (! shortcutsElement) {
        return false;
    }

    const shortcuts = JSON.parse(shortcutsElement.textContent);
    const shortcut = shortcuts[command.trim().toLowerCase()];

    if (! shortcut) {
        return false;
    }

    document.cookie = `dnsrecords_theme=${shortcut.theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

    window.location.assign(shortcut.url);

    return true;
}
