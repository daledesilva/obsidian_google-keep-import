import { Setting } from "obsidian";



export class SupportButtonSet {

    constructor(SettingEl: Setting) {
        SettingEl.addButton(btn => {
            btn.setClass('gki_button');
            btn.setTooltip('Message or follow developer');
            btn.setIcon('twitter');
            btn.onClick( (e) => {
                window.open('https://twitter.com/daledesilva', '_blank');
            })
        })
        SettingEl.addButton(btn => {
            btn.setClass('gki_button');
            btn.setTooltip('Support Developer');
            btn.setIcon('heart');
            btn.onClick( (e) => {
                window.open('https://ko-fi.com/N4N3JLUCW', '_blank');
            })
        })
    }

}
