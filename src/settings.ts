import {App, Modal, PluginSettingTab, Setting, Notice, Plugin, setTooltip} from "obsidian";
import MyPlugin from "./main";


// In settings we need to have the ability for the user to insert keywords that they want to be highlighted
// and then give them the ability to change how they want to be highlighted (css config)

interface HighlightSettings {
	name: string;
	foreground_color: string;
	background_color: string;
}

export interface MyPluginSettings {
	keywords: Record<string,HighlightSettings>;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
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
export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		
		var buffer: string = '';
		new Setting(containerEl)
			.setName('Highlighted Keywords')
			.setDesc('All the keywords that you want to be highlighted')
			.addText(text => text
				.setPlaceholder('Insert keyword')
				.onChange(value => buffer = value)
			)
			.addButton(btn => btn
				.setCta()
				.setButtonText('Save')
				.onClick(async () => {
					// insert the new word in the dropdown without needing to read from settings
					// TODO: maybe race condition ?? What happens if I misclick and do not want that word?
					const clean = getClassName(buffer);

					if (!this.plugin.settings.keywords[clean]) {
						dropdown.addOption(buffer, buffer);
						// default colors
						this.plugin.settings.keywords[clean] = {
							name: buffer,
							foreground_color: '#00ff00',
							background_color: '#000000'
						};
						await this.plugin.saveSettings();
						// this.display(); reload display
					} else {
						new Notice(`[ERROR]: Could not add ${buffer} conflict with ${this.plugin.settings.keywords[clean]}`)
					}
					
					buffer = ''; // empty the buffer
				})
			);
	
		let dropdown: any;
		// take the first value
		let selected_keyword: any = Object.keys(this.plugin.settings.keywords)[0] || "";
		new Setting(containerEl)
			.setName('Selected Keywords')
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
				.setButtonText('Edit Keyword')
				.onClick(async () => {
					new KeywordModal(this.app, selected_keyword, this).open();
				})
			);

	}
}

// --------------------- Modal Popups ---------------------
class KeywordModal extends Modal {
	keyword: string;
	settings: SampleSettingTab;

	constructor(app: App, keyword: string, settings: SampleSettingTab) {
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
		
		contentEl.createEl("h2", {text: `Keyword Settings`});

		new Setting(contentEl)
			.setName('Foreground Color')
			.addColorPicker(cp => cp
				.setValue(foreground_color)
				.onChange((value) => foreground_color = value)
			);

		new Setting(contentEl)
			.setName('Background Color')
			.addColorPicker(cp => cp
				.setValue(background_color)
				.onChange((value) => background_color = value)
			);

		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText('Delete Keyword')
				.onClick(() => {
					// TODO: create the delete option
				})
			)
			.addButton(btn => btn
				.setCta()
				.setButtonText('Save Changes')
				.onClick(async () => {
					// Here write the changes in the css class
					currentSettings['foreground_color'] = foreground_color;
					currentSettings['background_color'] = background_color;	
					await this.settings.plugin.saveSettings();
				})
			);
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}


// also have a preview inside the popup pane (to see how the colors you have chosen look like) (maybe before Save)? (have a side-by-side comparison)


// CHECK: the Full Calendar plugin settings
// They have popup so maybe have it like that

// CHECK: for problem. if you have no keywords and add just 1, and then click Edit Keyword it does not work okay : (