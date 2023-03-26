import { Notice } from "obsidian";
import KeepPlugin, { DEFAULT_SETTINGS } from "src/main";


///////////////////
///////////////////


/**
 * Resets the plugins settings back to default.
 */
export function resetSettings(plugin: KeepPlugin) {
    plugin.settings = JSON.parse( JSON.stringify(DEFAULT_SETTINGS) );
    plugin.saveSettings();
    new Notice('Google Keep Import settings reset');
}