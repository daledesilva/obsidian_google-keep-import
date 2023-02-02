import { Notice } from "obsidian";
import MyPlugin, { DEFAULT_SETTINGS } from "src/main";


export async function resetSettings(plugin: MyPlugin) {
    plugin.settings = JSON.parse( JSON.stringify(DEFAULT_SETTINGS) );
    await plugin.saveSettings();
    new Notice('Google Keep Import settings reset');
}