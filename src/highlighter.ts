import { Decoration, DecorationSet, EditorView, MatchDecorator, ViewPlugin, ViewUpdate } from "@codemirror/view";
import type { TodoHighlighterSettings } from './settings';


// Helper function to safely escape regex characters (e.g., escaping the ':' in 'TODO:')
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildTodoHighlighter(settings: TodoHighlighterSettings) {
    // 1. Get all valid keywords from settings and ignore empty names
    const keywords = Object.values(settings.keywords).filter(kw => kw.name.trim() !== "");

    // 2. If the user hasn't added any keywords yet, return a blank ViewPlugin to prevent errors
    if (keywords.length === 0) {
        return ViewPlugin.fromClass(class {
            decorations: DecorationSet = Decoration.none;
            constructor() {}
            update() {}
        }, { decorations: v => v.decorations });
    }

    // 3. Build a dynamic regex string that matches ANY of the keyword names
    const regexStr = keywords.map(kw => escapeRegex(kw.name)).join("|");
    const dynamicRegex = new RegExp(`(${regexStr})`, "g");

    // 4. Create the MatchDecorator using the dynamic regex
    const todoMatcher = new MatchDecorator({
        regexp: dynamicRegex,
        decoration: (match) => {
            const matchedText = match[0];

            // Find the specific settings object for the matched keyword
            const kwSetting = keywords.find(kw => kw.name === matchedText);

            if (kwSetting) {
				let styles = `
					color: ${kwSetting.foreground_color};
					border-radius: ${kwSetting.border_radius};
					padding: 0px 5px`;

				if (kwSetting.background)
					styles += `; background-color: ${kwSetting.background_color}`

				return Decoration.mark({
                    class: "cm-todo-highlight",
                    attributes: {
						style: `${styles}`
                    }
                });
            }

            // Fallback just in case
            return Decoration.mark({ class: "cm-todo-highlight" });
        }
    });

    // 5. Return the configured ViewPlugin
    return ViewPlugin.fromClass(class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = todoMatcher.createDeco(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = todoMatcher.updateDeco(update, this.decorations);
            }
        }
    }, {
        decorations: v => v.decorations
    });
}
