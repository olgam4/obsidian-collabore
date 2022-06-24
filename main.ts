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

const goLive = (app: App, name: string, password: string) => {
  const ydoc = new Y.Doc();
  const text = ydoc.getText('codemirror')

  const options = password === '' ? {} : { password }
  const provider = new WebrtcProvider(`obsidian://plugin-collabore-${name}`, ydoc, options as any);
  const view = app.workspace.getActiveViewOfType(MarkdownView);

  provider.awareness.setLocalStateField('user', {
    name: 'Anonymous' + Math.floor(Math.random() * 100),
    color: '#' + Math.floor(Math.random() * 16777215).toString(16),
  });

  const editor = view?.editor;
  const yText = provider.doc.getText('codemirror');

  if (yText.toString() !== '') {
    editor?.setValue(yText.toString());
  } else {
    editor && editor.getValue() !== '' && text.insert(0, editor.getValue())
  }

  const undoManager = new Y.UndoManager(yText);
  return yCollab(
    yText,
    provider.awareness,
    { undoManager },
  )
}

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;
  provider: WebrtcProvider;

  async onload() {
    await this.loadSettings();

    this.addRibbonIcon('star', 'Go Live', async () => {
      const cb = (name: string, password: string) => this.registerEditorExtension([
        keymap.of([
          ...yUndoManagerKeymap
        ]),
        goLive(this.app, name, password)
      ])

      new SampleModal(this.app, cb).open();
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
  callback: (...params: any[]) => void;
  constructor(app: App, callback: (...params: any[]) => void) {
    super(app);
    this.callback = callback || (() => {});
  }

  onOpen() {
    const {contentEl} = this;
    contentEl.empty()
    contentEl.createEl('h1', { text: 'Go Live' });

    contentEl.createEl("form", "form-multiplayer",
      (form) => {

        form.createEl("label", {
          attr: { for: "room-name" },
          text: "Room name"
        })

        form.createEl("input", {
          type: "text",
          attr: {
            name: "name",
            id: "room-name"
          },
          placeholder: "Room name",
        });
        form.createEl("label", {
          attr: { for: "room-password" },
          text: "Optional password"
        })

        form.createEl("input", {
          type: "password",
          attr: {
            name: "password",
            id: "room-password"
          },
          placeholder: "Room password",
        });

        form.createEl("label", {
          attr: { for: "room-servers" },
          text: "Optional signaling servers"
        })

        form.createEl("input", {
          type: "text",
          attr: {
            name: "servers",
            id: "room-servers"
          },
          placeholder: "wss://signaling.yjs.dev",
        });

        form.createEl("button", {
          text: "Create",
          type: "submit",
        });

        form.onsubmit = async (e) => {
          e.preventDefault();
          //@ts-ignore
          const name = form.querySelector('input[name="name"]')?.value;
          //@ts-ignore
          const servers = form.querySelector('input[name="servers"]')?.value
          //@ts-ignore
          const signalingServers = servers.split(',');
          //@ts-ignore
          const password = form.querySelector('input[name="password"]')?.value;

          this.callback(name, password);
          this.close();
        }
      })
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
