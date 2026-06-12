import { world, ItemStack, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { CONFIG, MODE_DISPLAY_NAMES } from "../config.js";
import { isAdmin } from "../utils/players.js";
import { broadcast } from "../effects/visual-effects.js";
import {
  isBedrockBoxStructureEditEnabled,
  toggleBedrockBoxStructureEdit,
} from "../state.js";

/** @type {((player: import("@minecraft/server").Player, args: string[]) => void | Promise<void>) | null} */
let runSabCommand = null;

const GAME_MENU_ENTRIES = [
  {
    modeId: "bedrock_box",
    label: MODE_DISPLAY_NAMES.bedrock_box,
  },
];

const MAIN_MENU_ACTIONS = [
  { kind: "game", modeId: "bedrock_box" },
  { kind: "command", label: "停止", args: ["stop"] },
  { kind: "command", label: "リセット", args: ["reset"] },
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

function resolveFreshPlayer(player) {
  const freshPlayer = world.getPlayers({ name: player.name })[0];
  if (!freshPlayer) {
    console.warn(`[SAB] SAB menu action skipped: player ${player.name} not found.`);
    return null;
  }
  return freshPlayer;
}

function runMenuCommand(player, args) {
  if (!runSabCommand) return;
  const freshPlayer = resolveFreshPlayer(player);
  if (!freshPlayer) return;

  console.warn(`[SAB] SAB menu action: ${args.join(" ")}`);

  system.run(() => {
    Promise.resolve(runSabCommand(freshPlayer, args)).catch((error) => {
      console.warn(`[SAB] SAB menu action failed: ${error?.message ?? error}`);
    });
  });
}

function getGameMenuEntry(modeId) {
  return GAME_MENU_ENTRIES.find((entry) => entry.modeId === modeId);
}

async function showBedrockBoxSubMenu(player) {
  const game = getGameMenuEntry("bedrock_box");
  const editOn = isBedrockBoxStructureEditEnabled();

  const form = new ActionFormData()
    .title(game?.label ?? "BedrockBox")
    .body(
      editOn
        ? "箱編集: ON — 床・壁・枠を壊して編集できます。"
        : "箱編集: OFF — 箱は保護されています。",
    )
    .button("開始")
    .button(editOn ? "箱編集: OFF にする" : "箱編集: ON にする")
    .button("箱を削除");

  const result = await form.show(player);
  if (result.canceled) return;

  if (result.selection === 0) {
    runMenuCommand(player, ["start", "box"]);
    return;
  }

  if (result.selection === 1) {
    const enabled = toggleBedrockBoxStructureEdit();
    broadcast(
      enabled
        ? "BedrockBox structure edit: ON (walls and floor can be broken)."
        : "BedrockBox structure edit: OFF (structure protected).",
    );
    return;
  }

  if (result.selection === 2) {
    runMenuCommand(player, ["deletebox"]);
  }
}

async function showSabMenu(player) {
  if (!runSabCommand) return;

  const form = new ActionFormData()
    .title("SAB 操作メニュー")
    .body("ゲームを選ぶか、停止・リセットを実行してください。");

  for (const action of MAIN_MENU_ACTIONS) {
    if (action.kind === "game") {
      const game = getGameMenuEntry(action.modeId);
      form.button(game?.label ?? action.modeId);
    } else {
      form.button(action.label);
    }
  }

  const result = await form.show(player);
  if (result.canceled) return;

  const action = MAIN_MENU_ACTIONS[result.selection];
  if (!action) return;

  if (action.kind === "game") {
    if (action.modeId === "bedrock_box") {
      await showBedrockBoxSubMenu(player);
    }
    return;
  }

  runMenuCommand(player, action.args);
}
