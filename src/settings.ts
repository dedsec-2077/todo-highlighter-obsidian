import { App, Modal, PluginSettingTab, Setting, Notice, TextComponent, DropdownComponent } from "obsidian";
import MyPlugin from "./main";


interface HighlightSettings {
	name: string;
	border_radius: string;
	foreground_color: string;
	background_color: string;
}

export interface TodoHighlighterSettings {
	keywords: Record<string,HighlightSettings>;
}

export const DEFAULT_SETTINGS: TodoHighlighterSettings = {
	keywords: {}
}


// --------------------- Helper Functions ---------------------
// CSS settings will be of type:
// for TODO -> .todo-highlight
// for TODO: -> .todo-highlight (strip non alphanumerics, except _- and whatever else can be as a class name in CSS)
function getClassName(keyword: string): string {
	return keyword.toLowerCase().replace(/[^\w-]/g, '');
}

function getOptions(keywords: Record<string, HighlightSettings>): Record<string, string> {
    const options: Record<string, string> = {};

    Object.keys(keywords).forEach(key => {
        if (key.trim() !== "" && keywords[key]) {
            options[key] = keywords[key].name;
        }
    });

    return options;
}


// --------------------- Settings Tab ---------------------
export class TodoHighlighterSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		let textComponent: TextComponent;

		containerEl.empty();

		let buffer: string = '';
		new Setting(containerEl)
			.setName('Highlighted keywords')
			.setDesc('All the keywords that you want to be highlighted')
			.addText(text => {
				textComponent = text;
				return text
					.setPlaceholder('Insert keyword')
					.onChange(value => buffer = value);
			})
			.addButton(btn => btn
				.setCta()
				.setButtonText('Save')
				.onClick(async () => {
					// insert the new word in the dropdown without needing to read from settings
					// TODO: maybe race condition ?? What happens if I miss-click and do not want that word?
					buffer = buffer.trim().replaceAll(" ", "_");
					const clean = getClassName(buffer);

					if (!this.plugin.settings.keywords[clean]) {
						dropdown.addOption(buffer, buffer);
						// default colors
						this.plugin.settings.keywords[clean] = {
							name: buffer,
							border_radius: '0px',
							foreground_color: '#00ff00',
							background_color: '#000000'
						};
						await this.plugin.saveSettings();
						// MAYBE: this.display(); reload display
					} else {
						new Notice(`[ERROR]: Could not add ${buffer} conflict with ${this.plugin.settings.keywords[clean].name}`)
					}

					new Notice(`[SUCCESS]: Inserted new keyword "${buffer}"`);
					buffer = '';
					textComponent.setValue('');
				})
			);

		let dropdown: DropdownComponent;
		let selected_keyword: string = Object.keys(this.plugin.settings.keywords)[0] || "";  // take the first value
		new Setting(containerEl)
			.setName('Selected keywords')
			.setDesc('These are the keywords you have selected')
			.setClass('todo-keyword-setting')
			.addDropdown(dd => {
				dropdown = dd;
				dd.addOptions(getOptions(this.plugin.settings.keywords))
				dd.onChange((value) => {
					selected_keyword = value;
				})
			})
			.addButton(btn => btn
				.setButtonText('Edit keyword')
				.onClick(async () => {
					new KeywordModal(this.app, selected_keyword, this).open();
				})
			);

	}
}

// --------------------- Modal Popups ---------------------
class KeywordModal extends Modal {
	keyword: string;
	settings: TodoHighlighterSettingTab;

	constructor(app: App, keyword: string, settings: TodoHighlighterSettingTab) {
		super(app);
		this.keyword = keyword;
		this.settings = settings;
	}

	onOpen() {
		// Also on open, load the current settings
		let {contentEl} = this;
		let clean = getClassName(this.keyword);
		const currentSettings = this.settings.plugin.settings.keywords[clean];

		if (!currentSettings) return;

		let foreground_color: string = currentSettings['foreground_color'];
		let background_color: string = currentSettings['background_color'];
		let border_radius: string = currentSettings['border_radius'];

		contentEl.createEl("h2", {text: `Keyword settings`});

		// ========== Color Pickers ==========
		new Setting(contentEl)
			.setName('Foreground color')
			.addColorPicker(cp => cp
				.setValue(foreground_color)
				.onChange((value) => {
					foreground_color = value
					newPreviewSpan.style.color = value;
				})
			);

		new Setting(contentEl)
			.setName('Background color')
			.addColorPicker(cp => cp
				.setValue(background_color)
				.onChange((value) => {
					background_color = value;
					newPreviewSpan.style.background = value;
				})
			);

		new Setting(contentEl)
			.setName('Border radius')
			.addText(cp => cp
				.setValue(border_radius)
				.onChange((value) => {
					border_radius = value;
					newPreviewSpan.style.borderRadius = value;
				})
			);


		// ========== Preview ==========
		const bigDiv = contentEl.createDiv({ attr: { style: 'display:grid; grid-template-columns:1fr 1fr;'} });

		// Current Preview
		const oldPreviewContainer = bigDiv.createDiv({ cls: 'preview-container' });
		oldPreviewContainer.createEl('p', { text: 'Current preview', cls: 'preview-label' });
		const oldPreviewInner = oldPreviewContainer.createDiv({ cls : 'preview-inner-container' });
		oldPreviewInner.createEl('span', { text: currentSettings.name, cls: 'preview-span',
			attr: { style: `color: ${foreground_color}; background: ${ background_color }; border-radius: ${border_radius}`}});

		// New Preview
		const newPreviewContainer = bigDiv.createDiv({ cls: 'preview-container' });
		newPreviewContainer.createEl('p', { text: 'New preview', cls: 'preview-label' });
		const newPreviewInner = newPreviewContainer.createDiv({	cls: 'preview-inner-container' });
		const newPreviewSpan = newPreviewInner.createEl('span', { text: currentSettings.name, cls: 'preview-span',
			attr: {style: `color: ${ foreground_color }; background: ${ background_color }; border-radius: ${border_radius}`}});


		// CHECK at the end to see a better way to fix this part of the code (spoiler alert: CSS classes)

		// ========== Buttons ==========
		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText('Delete keyword')
				.setDestructive()
				.setCta()
				.onClick(async () => {
					delete this.settings.plugin.settings.keywords[clean];
					await this.settings.plugin.saveSettings();

					this.settings.update();
					this.close();
				})
			)
			.addButton(btn => btn
				.setCta()
				.setButtonText('Save changes')
				.onClick(async () => {
					// Here write the changes in the css class
					currentSettings['foreground_color'] = foreground_color;
					currentSettings['background_color'] = background_color;
					currentSettings['border_radius'] = border_radius;
					await this.settings.plugin.saveSettings();

					new Notice(`[SUCCESS]: Changed values for "${currentSettings['name']}"`)
				})
			);
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

// add border radius maybe? also the ability to have it color the whole line? not just the specific word?
// also have a preview inside the popup pane (to see how the colors you have chosen look like) (maybe before Save)? (have a side-by-side comparison)
// CHECK: for problem. if you have no keywords and add just 1, and then click Edit Keyword it does not work okay : (

/*  style.css
.keyword-preview-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 20px 0;
}

.keyword-preview-box {
    height: 120px;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    overflow: hidden;
}

.keyword-preview-label {
    margin: 5px;
    font-size: 0.7em;
    text-align: center;
    color: var(--text-muted);
}

.keyword-preview-inner {
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    // We will set these variables in TS
    background-color: var(--kw-bg);
    color: var(--kw-fg);
}

.keyword-preview-inner span {
    font-weight: bold;
    font-size: 1.2em;
}
*/
