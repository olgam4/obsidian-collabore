import { App, MarkdownView, Modal, Plugin, PluginSettingTab, Setting } from 'obsidian';

import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next';

import { EditorView, keymap } from '@codemirror/view'

interface MyPluginSettings {
  is_live: boolean;
  mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  is_live: false,
  mySetting: '',
}

const goLive = (app: App, name: string, password: string) => {
  const ydoc = new Y.Doc();
  const text = ydoc.getText('codemirror')

  const options = password === '' ? {} : { password }
  const provider = new WebrtcProvider(`obsidian://plugin-collabore-${name}`, ydoc, options as any);
  const view = app.workspace.getActiveViewOfType(MarkdownView);

  provider.awareness.setLocalStateField('user', {
    name: 'Anonymous' + Math.floor(Math.random() * 100),
    color: '#1be7ff',
    colorLight: '#1be7ff33',
  });

  const editor = view?.editor;
  const yText = provider.doc.getText('codemirror');

  if (yText.toString() !== '') {
    editor && editor.getValue() !== '' && text.insert(0, editor.getValue())
  } else {
    editor?.setValue(yText.toString());
  }

  const undoManager = new Y.UndoManager(yText);

  console.log('yText', yText)
  debugger
  const extension = () => yCollab(
    yText,
    provider.awareness,
    { undoManager },
  )

  return {
    provider,
    extension,
  }
}

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;
  provider: WebrtcProvider;
  statusBarItem: HTMLElement;

  async onload() {
    await this.loadSettings();

    this.addRibbonIcon('paper-plane', 'Collaborate', () => {
      console.log(this.provider?.awareness.getLocalState())
      console.log(this.provider?.awareness.getStates())
      console.log(this.app.workspace.getActiveViewOfType(MarkdownView)?.getState())
      console.log(this.app.workspace.getActiveViewOfType(MarkdownView)?.getEphemeralState())
      const view = this.app.workspace.getActiveViewOfType(MarkdownView)
      console.log(view?.sourceMode.cmEditor.cm.state)
    })

    this.addRibbonIcon('star', 'Go Live', async () => {
      if (this.statusBarItem && this.statusBarItem.innerText === 'Online') {
        this.statusBarItem.innerText = 'Offline';
        this.provider.disconnect();
        return;
      }

      const cb = (name: string, password: string) => {
        const { extension, provider } = goLive(this.app, name, password)
        this.provider = provider;
        this.registerEditorExtension([
          keymap.of([
            ...yUndoManagerKeymap
          ]),
          extension(),
        ])

        const view = this.app.workspace.getActiveViewOfType(MarkdownView)
        console.log(view?.getState())
        console.log(view?.getEphemeralState())
      }
      new SampleModal(this.app, cb).open();

      this.statusBarItem = this.addStatusBarItem()
      this.statusBarItem.createEl('span', { text: 'Online' })
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
