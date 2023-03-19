import { Setting } from "obsidian";



export class SupportButtonSet {

    constructor(SettingEl: Setting) {
        SettingEl.addButton(btn => {
            btn.setClass('uo_button');
            btn.setTooltip('Message or follow developer');
            btn.setIcon('twitter');
            btn.onClick( (e) => {
                window.open('https://twitter.com/daledesilva', 'twitter');
            })
        })
        SettingEl.addButton(btn => {
            btn.setClass('uo_button');
            btn.setTooltip('Tip Developer');
            btn.setIcon('heart');
            btn.onClick( (e) => {
                window.open('https://ko-fi.com/N4N3JLUCW', 'tip-tab');
            })
        })
    }

}
