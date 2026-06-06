import { world, ItemStack, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { CONFIG } from "../config.js";
import { isAdmin } from "../utils/players.js";
import { broadcast } from "../effects/visual-effects.js";

/** @type {((player: import("@minecraft/server").Player, args: string[]) => void | Promise<void>) | null} */
let runSabCommand = null;

const MENU_ACTIONS = [
  { label: "状態確認", args: ["status"] },
  { label: "開始: BedrockBox", args: ["start", "box"] },
  { label: "開始: 埋めチャレンジ", args: ["start"] },
  { label: "開始: 埋めて守れ", args: ["start", "defend"] },
  { label: "停止", args: ["stop"] },
  { label: "リセット", args: ["reset"] },
  { label: "テスト: ウール追加", args: ["test", "block"] },
  { label: "テスト: 穴", args: ["test", "hole"] },
  { label: "テスト: スロー", args: ["test", "slow"] },
  { label: "テスト: 盲目", args: ["test", "blind"] },
  { label: "テスト: ニワトリ", args: ["test", "chicken"] },
];

export function giveMenuItem(player, { announce = true } = {}) {
  const inventory = player.getComponent("inventory")?.container;
  if (!inventory) {
    broadcast("Menu item failed: inventory not available.");
    return;
  }

  const item = new ItemStack(CONFIG.menuItem.typeId, 1);
  item.nameTag = CONFIG.menuItem.nameTag;
  const leftover = inventory.addItem(item);
  if (leftover) {
    player.dimension.spawnItem(leftover, player.location);
  }
  if (announce) {
    broadcast("SAB menu item given.");
  }
}

export function registerMenuItem(runCommand) {
  runSabCommand = runCommand;

  const itemUse = world.afterEvents?.itemUse;
  if (!itemUse) {
    console.warn(
      "[SAB] itemUse event is not available in this Script API version.",
    );
    return;
  }

  itemUse.subscribe((event) => {
    const player = event.source;
    const item = event.itemStack;

    if (!player || !item) return;
    if (item.typeId !== CONFIG.menuItem.typeId) return;
    if (item.nameTag !== CONFIG.menuItem.nameTag) return;

    if (!isAdmin(player)) {
      player.sendMessage("[SAB] Permission denied: SAB admin only.");
      return;
    }

    console.warn(`[SAB] SAB menu opened by ${player.name}`);

    system.run(() => {
      showSabMenu(player).catch((error) => {
        console.warn(`[SAB] SAB menu failed: ${error?.message ?? error}`);
      });
    });
  });

  console.warn("[SAB] menu item handler registered.");
}

async function showSabMenu(player) {
  if (!runSabCommand) return;

  const form = new ActionFormData()
    .title("SAB 操作メニュー")
    .body("実行する操作を選んでください。");

  for (const action of MENU_ACTIONS) {
    form.button(action.label);
  }

  const result = await form.show(player);
  if (result.canceled) return;

  const action = MENU_ACTIONS[result.selection];
  if (!action) return;

  const playerName = player.name;
  const freshPlayer = world.getPlayers({ name: playerName })[0];
  if (!freshPlayer) {
    console.warn(`[SAB] SAB menu action skipped: player ${playerName} not found.`);
    return;
  }

  console.warn(`[SAB] SAB menu action: ${action.args.join(" ")}`);

  system.run(() => {
    Promise.resolve(runSabCommand(freshPlayer, action.args)).catch((error) => {
      console.warn(`[SAB] SAB menu action failed: ${error?.message ?? error}`);
    });
  });
}
