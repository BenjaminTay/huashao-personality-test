"use client";

import { useState } from "react";
import { ARCHETYPES } from "../data/archetypes";
import type { ArchetypeId } from "../data/types";

/**
 * 本地验收用的结果页预览条（仅开发模式或 URL 带 ?preview 时渲染）。
 * 点击任意人格 → 用"该型自洽答案路径"直接算出并展示该型结果页，
 * 避免每次都要答完 24 题才能验收。内容数据改动后由 HMR 即时生效。
 */
export function ResultPreviewBar({
  active,
  onPick,
  onExit,
}: {
  active: ArchetypeId | null;
  onPick: (type: ArchetypeId) => void;
  onExit: () => void;
}) {
  const [open, setOpen] = useState(true);
  const typeIds = Object.keys(ARCHETYPES) as ArchetypeId[];

  if (!open) {
    return (
      <button
        className="dev-preview-reopen"
        type="button"
        onClick={() => setOpen(true)}
      >
        预览结果页 ▸
      </button>
    );
  }

  return (
    <aside className="dev-preview-bar" aria-label="本地结果页预览">
      <div className="dev-preview-head">
        <span>
          DEV PREVIEW / 结果页预览 · 点击人格直接查看对应结果页，退出可恢复答题进度
        </span>
        <div className="dev-preview-head-actions">
          {active && (
            <button className="dev-preview-exit" type="button" onClick={onExit}>
              退出预览
            </button>
          )}
          <button className="dev-preview-close" type="button" onClick={() => setOpen(false)}>
            × 收起
          </button>
        </div>
      </div>
      <div className="dev-preview-actions">
        {typeIds.map((type) => (
          <button
            className={`dev-preview-chip${active === type ? " is-active" : ""}`}
            type="button"
            key={type}
            onClick={() => onPick(type)}
          >
            {ARCHETYPES[type].personName}
          </button>
        ))}
      </div>
    </aside>
  );
}
