# Google Keep Import Plugin

Google Keep Import is a plugin for [Obsidian](https://obsidian.md) that enables easily importing an exported set of backup notes and related attachments from Google Keep.

<div>
  <image src="docs/media/start-import-modal.png" width="43%" alt="A screenshot of the plugin's file import dialog."/>
  <image src="docs/media/progress-preview.gif" width="56%" alt="A preview of the progress dialog and error log."/>
</div>

## 🖥️ Requirements
- Minimum Obsidian Version: **1.1.10** *(Anything downloaded after Jan 13th 2023)*

<blockquote style="background-color: #f7f7f7; color: #333; padding: 10px; font-size:0.9em">
  <strong>Note:</strong>The plugin will likely work on older versions of Obsidian, however, these haven't been tested. If you have some reason to not be updating your Obsidian and it's not letting you install, you can either edit this plugin yourself or consider contacting me through the support section below.
</blockquote>

## 🛠️ Usage
1. Install this plugin from the community plugins section of Obsidian's settings.
1. To export your files from Google Keep, open [Google Takeout](https://takeout.google.com/) and select only Google Keep files *(Depending on the amount of notes and attachments, this might take a while)*
2. Once you have the exported zip, unzip it so you have all the files separately.
3. In Obsidian, press `CMD+P` and select the `Google Keep Import` action.
3. In the modal that opens, drag in all the unzipped files and follow the instructions import the files.

## 🎉 Features

### Error log
The plugin will always give you a real-time log of any files it is unable to import or that it believes aren't supported so that you can cancel the import immediately if needed, or find the files later to edit or convert.

### Imports binary files irrelevant of Keep notes
The plugin will import any binary files like images even if there isn't a corresponding Keep note. This means you can use the plugin as a batch import for a folder of files that didn't come from Keep if needed.

### Unsupported files
The plugin can import any file it sees regardless of whether ut cam from Keep or Obsidian supports it. You can turn this on if needed in the settings, but it's off by default and will let you know which file it skips.

## ⚙️ Customisable settings
The plugin provides a settings page that is also accessible during the import process. This allows you to tailor what gets imported and how dates, colours, tags, and more from the Keep files are treated in Obsidian.

### Settings:
<image src="docs/media/settings_basics.jpg" width="500px" alt="A screenshot of the plugin's settings. See below for a description."/>
<image src="docs/media/settings_inclusions.jpg" width="500px" alt="A screenshot of the plugin's settings. See below for a description."/>
<image src="docs/media/settings_tags.jpg" width="500px" alt="A screenshot of the plugin's settings. See below for a description."/>
<image src="docs/media/settings_problem-characters.jpg" width="500px" alt="A screenshot of the plugin's settings. See below for a description."/>
<image src="docs/media/settings_invalid-characters.jpg" width="500px" alt="A screenshot of the plugin's settings. See below for a description."/>

<details>
  <summary>Expand to read breakdown of settings</summary>
  
  #### Basics
  - **Note import folder**: Defines the Obsidian folder where notes will be imported.
  - **Attachment import folder**: Defines the Obsidian folder where note attachments will be imported.
  - **Unsupported attachment import folder**: Defines the Obsidian folder where note attachments that aren't supported by Obsidian will be imported.
  - **Note creation date**: Defines which date should be used as the 'created on' date for each new Obsidian note; The date of Obsidian import, or the original Google Keep creation date.
  #### Inclusions
  Whether to import specific types of notes or ignore them.
  - **Import archived notes**
  - **Import trashed notes**
  - **Import unsupported files**:
    - **Import html files**:
    Unsupported (and html files) aren't imported by default as they will usually be invisible in Obsidian. HTML files from Google Takeout exports are also duplicates of other files so they do not need to be imported.
  #### Tags
  Whether to apply tags to notes in Obsidian to represent these attributes of the original Google Keep notes.
  - **Add label tags**
  - **Add colour tags**
  - **Add pinned tags**
  - **Add attachment tags**
  - **Add archived tags**
  - **Add trashed tags**
  #### Character Mapping
  Allows mapping any characters in titles to valid characters for use in your notes filenames. This is set to make files valid for all operating systems by default.
  - **Problem characters**
  These characters may not break the import, but the wil degrade functionality in certain places within Obsidian.
  - **Invalid characters**
  These characters in the titles of your imported notes can prevent import on certain operating systems.

</details>

---

## ❤️ Support
If you find this plugin saves you time or helps you in some way, please consider supporting my development of plugins and other free community material like this. A simply way is to follow and message me on twitter at [@daledesilva](https://twitter.com/daledesilva) or Mastadon at [indieweb.social/@daledesilva](https://indieweb.social/@daledesilva), and you can also support with a donation below.

<p>
  <a href="https://twitter.com/daledesilva" target="_blank_">
    <img src="docs/media/twitter-btn.svg" height="40px" alt="Dale de Silva on Twitter">
  </a>
  <a href="https://indieweb.social/@daledesilva" target="_blank">
    <img src="docs/media/mastodon-btn.svg" height="40px" alt="Dale de Silva on Mastodon">
  </a>
  <a href="https://ko-fi.com/N4N3JLUCW" target="_blank">
    <img src="docs/media/support-btn.svg" height="40px" alt="Support me on Ko-fi">
  </a>
</p>

## 🤖 My other work
You can find links to my other projects on [designdebt.club](https://designdebt.club), where I blog about design and development, as well as release other plugins like this one. You can also find my writing at at [falterinresolute.com](https://falterinresolute.com) where I combine philosophy and animation.

<p>
  <a href="https://designdebt.club" target="_blank">
    <img src="docs/media/design-debt-club-btn.svg" height="50px" alt="Design Debt Club">
  </a>
  <a href="https://falterinresolute.com" target="_blank">
    <img src="docs/media/falter-in-resolute-btn.svg" height="50px" alt="Falter In Resolute Blog">
  </a>
</p>

---

## 👨‍💻 Technical details

<!-- ## Code tour
While some people have the technical skills to read through a plugins code, not everyone does. I've therefore created a video tour in which I describe how the plugin is constructed fro anyone who is curious or would like to adapt the plugin.

>Insert code tour video -->

### Manually installing the plugin
The plugin is listed in Community Plugins within your Obsidian install, however, if for some reason you would like to manually install it instead, you will need to follow the How to Contribute section below in order to build the plugin, and then copy the dist folder into your Obsidian vault's plugins folder.

### How to contribute
- Clone this repo.
- `npm i` to install dependencies
- `npm run dev` to start compilation in watch mode.
- Copy the `dist` folder to your vault's plugins folder, or read the instructions inside `src/static/.hotreload/`
