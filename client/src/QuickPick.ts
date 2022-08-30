import { Disposable, env, QuickInputButtons, QuickPick, QuickPickItem, QuickPickItemButtonEvent, window } from 'vscode';
import { InstallDbtPackages } from './commands/InstallDbtPackages';
import { log } from './Logger';

export class DbtWizardQuickPick {
  static async showQuickPick(
    options: Pick<QuickPick<QuickPickItem>, 'buttons' | 'title' | 'placeholder'>,
    itemsPromise: Promise<QuickPickItem[]>,
    onDidTriggerItemButton: (e: QuickPickItemButtonEvent<QuickPickItem>) => void,
    activeItemLabel?: string,
  ): Promise<string | undefined> {
    const disposables: Disposable[] = [];
    const pick = window.createQuickPick();
    pick.busy = true;
    pick.buttons = options.buttons;
    pick.title = options.title;
    pick.placeholder = options.placeholder;
    pick.ignoreFocusOut = true;
    itemsPromise
      .then(items => {
        pick.busy = false;
        pick.items = items;
        if (activeItemLabel) {
          const item = pick.items.find(i => i.label === activeItemLabel);
          if (item) {
            pick.activeItems = [item];
          }
        }
        return items;
      })
      .catch(e => log(`Error while fetching items for QuickPick: ${e instanceof Error ? e.message : String(e)}`));

    pick.onDidTriggerItemButton(onDidTriggerItemButton);

    try {
      return await new Promise<string | undefined>((resolve, reject) => {
        disposables.push(
          pick.onDidTriggerButton(async button => {
            if (button === QuickInputButtons.Back) {
              reject(QuickInputButtons.Back);
            } else if (button.tooltip === InstallDbtPackages.DBT_HUB_TOOLTIP) {
              await env.openExternal(InstallDbtPackages.HUB_URI);
            }
          }),
          pick.onDidAccept(() => {
            const [selection] = pick.selectedItems;
            resolve(selection.label);
            pick.hide();
          }),
          pick.onDidHide(() => {
            resolve(undefined);
          }),
        );
        pick.show();
      });
    } finally {
      disposables.forEach(d => {
        d.dispose();
      });
    }
  }
}
