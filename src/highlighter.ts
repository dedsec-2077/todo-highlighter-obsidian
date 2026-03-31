import {Decoration, DecorationSet, EditorView, MatchDecorator, ViewPlugin, ViewUpdate} from "@codemirror/view";

const todoDecoration = Decoration.mark({
    class: "cm-todo-highlight"
});

const todoMatcher = new MatchDecorator({
    regexp:/TODO:/g,
    decoration: m => todoDecoration
})

export const todoHighlighter = ViewPlugin.fromClass(class {
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