import { App, Modal, PluginSettingTab, Setting, Notice, TextComponent, DropdownComponent } from "obsidian";
import MyPlugin from "./main";


interface HighlightSettings {
	name: string;
	border_radius: string;
	foreground_color: string;
	background: boolean;
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
						this.plugin.settings.keywords[clean] = {
							name: buffer,
							background: false,
							border_radius: '0px',
							foreground_color: '#00ff00',
							background_color: '#000000'
						};
						await this.plugin.saveSettings();

						this.display();

						new Notice(`[SUCCESS]: Inserted new keyword "${buffer}"`);
					} else {
						new Notice(`[ERROR]: Could not add ${buffer} conflict with ${this.plugin.settings.keywords[clean].name}`)
					}

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
				dd.setDisabled(!selected_keyword);
				dd.onChange((value) => {
					selected_keyword = value;
				})
			})
			.addButton(btn => btn
				.setButtonText('Edit keyword')
				.setDisabled(!selected_keyword)
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

		let background: boolean = currentSettings['background'];
		let border_radius: string = currentSettings['border_radius'];
		let foreground_color: string = currentSettings['foreground_color'];
		let background_color: string = currentSettings['background_color'];

		contentEl.createEl("h2", {text: `Keyword settings`});

		const updateNewPreview = () => {
			newPreviewSpan.setCssProps({
				"color": foreground_color,
				"border-radius": border_radius,
				"background": background ? background_color : 'transparent'
			})
		};

		// ========== Color Pickers ==========
		new Setting(contentEl)
			.setName('Foreground color')
			.addColorPicker(cp => cp
				.setValue(foreground_color)
				.onChange((value) => {
					foreground_color = value;
					updateNewPreview();
				})
			);

		new Setting(contentEl)
			.setName('Background color')
			.addToggle(cp => cp
				.setValue(background)
				.onChange((value) => {
					background = value;
					updateNewPreview();
				})
			)
			.addColorPicker(cp => cp
				.setValue(background_color)
				.onChange((value) => {
					background_color = value;
					updateNewPreview();
				})
			);

		new Setting(contentEl)
			.setName('Border radius')
			.addText(cp => cp
				.setValue(border_radius)
				.onChange((value) => {
					border_radius = value;
					updateNewPreview();
				})
			);


		// ========== Preview ==========
		const bigDiv = contentEl.createDiv({ attr: { style: 'display:grid; grid-template-columns:1fr 1fr;'} });

		// Current Preview
		const oldPreviewBackground = (background) ? `; background: ${background_color}` : '';
		const oldPreviewContainer = bigDiv.createDiv({ cls: 'preview-container' });
		oldPreviewContainer.createEl('p', { text: 'Current preview', cls: 'preview-label' });
		const oldPreviewInner = oldPreviewContainer.createDiv({ cls : 'preview-inner-container' });
		oldPreviewInner.createEl('span', { text: currentSettings.name, cls: 'preview-span',
			attr: { style: `color: ${foreground_color}; border-radius: ${border_radius}; padding: 0px 5px ${oldPreviewBackground}`}});

		// New Preview
		const newPreviewBackground = (background) ? `; background: ${background_color}` : '';
		const newPreviewContainer = bigDiv.createDiv({ cls: 'preview-container' });
		newPreviewContainer.createEl('p', { text: 'New preview', cls: 'preview-label' });
		const newPreviewInner = newPreviewContainer.createDiv({	cls: 'preview-inner-container' });
		const newPreviewSpan = newPreviewInner.createEl('span', {
			text: currentSettings.name, cls: 'preview-span',
			attr: { style: `color: ${foreground_color}; border-radius: ${border_radius}; padding: 0px 5px ${newPreviewBackground}`}});


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
					currentSettings['background'] = background;
					await this.settings.plugin.saveSettings();

					new Notice(`[SUCCESS]: Changed values for "${currentSettings['name']}"`)
					// update the Modal window after saving changes
					this.contentEl.empty();
					this.onOpen();
				})
			);
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

// TODO: add the ability to have it color the whole line? not just the specific word?
