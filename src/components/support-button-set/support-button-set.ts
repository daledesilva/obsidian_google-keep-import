import { Setting } from "obsidian";



export class SupportButtonSet {

    constructor(settingEl: Setting) {
        settingEl.addButton(btn => {
            btn.setClass('gki_button');
            btn.setTooltip('Contact @daledesilva@indieweb.social');
            btn.setIcon('mastodon');
            btn.onClick( (e) => {
                window.open('https://indieweb.social/@daledesilva', '_blank');
            })
        })
        settingEl.addButton(btn => {
            btn.setClass('gki_button');
            btn.setTooltip('Contact @daledesilva');
            btn.setIcon('twitter');
            btn.onClick( (e) => {
                window.open('https://twitter.com/daledesilva', '_blank');
            })
        })
        settingEl.addButton(btn => {
            btn.setClass('gki_button');
            btn.setTooltip('Support developer');
            btn.setIcon('heart');
            btn.onClick( (e) => {
                window.open('https://ko-fi.com/N4N3JLUCW', '_blank');
            })
        })
    }

}
