import { MarkdownView, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, TodoHighlighterSettingTab, type TodoHighlighterSettings } from "./settings";
import { buildTodoHighlighter } from 'highlighter';
import { Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";


export default class TodoHighlighterPlugin extends Plugin {
	settings: TodoHighlighterSettings;

	private highlighterCompartment = new Compartment();

	async onload() {
		await this.loadSettings();

		// Here we load the todoHighlighter
		this.registerEditorExtension(this.highlighterCompartment.of(buildTodoHighlighter(this.settings)));

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TodoHighlighterSettingTab(this.app, this));

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.debug('setInterval'), 5 * 60 * 1000));

		console.debug("[TODO-Highlighter]: Plugin loaded...")
	}

	onunload() {
		console.debug("[TODO-Highlighter]: Plugin unloaded...")
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<TodoHighlighterSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.updateHighlighter();
	}

	updateHighlighter() {
		const newExtension = buildTodoHighlighter(this.settings);

		this.app.workspace.getLeavesOfType("markdown").forEach(leaf => {
			const view = leaf.view as MarkdownView;

			const cm = (view.editor as unknown as { cm?: EditorView }).cm;

	        if (cm)
				cm.dispatch({
	                effects: this.highlighterCompartment.reconfigure(newExtension)
	            });
		})
	}
}
