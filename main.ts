import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next';

import { keymap } from '@codemirror/view'

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
  provider: WebrtcProvider;

	async onload() {
		await this.loadSettings();

    const ydoc = new Y.Doc();
    const text = ydoc.getText('codemirror')

    const provider = new WebrtcProvider('obsidian://plugin-collabore', ydoc);

    provider.awareness.setLocalStateField('user', {
      name: 'Anonymous' + Math.floor(Math.random() * 100),
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    });

    this.addRibbonIcon('settings', 'Settings', () => {
      console.log(provider.doc.getText('codemirror').toString());
    })

    this.addRibbonIcon('dice', 'Dice', async () => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);

      const editor = view?.editor;
      const yText = provider.doc.getText('codemirror');

      if (yText.toString() !== '') {
        editor?.setValue(yText.toString());
      } else {
        editor && editor.getValue() !== '' && text.insert(0, editor.getValue())
      }

      const undoManager = new Y.UndoManager(yText);
      this.registerEditorExtension([
        keymap.of([
          ...yUndoManagerKeymap
        ]),
        yCollab(
          yText,
          provider.awareness,
          { undoManager },
        )
      ])
    });

		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
