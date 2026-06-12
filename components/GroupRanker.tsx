"use client";

import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Team } from "@/lib/types";

interface Props {
  group: string;
  teams: Team[];
  order: number[] | null; // team ids in predicted order, or null if untouched
  disabled: boolean;
  onReorder: (teamIds: number[]) => void;
}

export default function GroupRanker({ group, teams, order, disabled, onReorder }: Props) {
  const ids = useMemo(
    () => order ?? teams.map((t) => t.id),
    [order, teams]
  );
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const touched = order !== null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(Number(active.id));
    const newIndex = ids.indexOf(Number(over.id));
    onReorder(arrayMove(ids, oldIndex, newIndex));
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    onReorder(arrayMove(ids, index, target));
  };

  return (
    <div>
      <p className="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-500">
        GROUP {group}
        {!touched && !disabled && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700">
            not saved yet — drag or tap ↑↓ to set
          </span>
        )}
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className="space-y-1">
            {ids.map((id, i) => (
              <SortableTeam
                key={id}
                id={id}
                position={i + 1}
                name={teamById.get(id)?.name ?? String(id)}
                flag={teamById.get(id)?.flag_url ?? null}
                disabled={disabled}
                onUp={() => move(i, -1)}
                onDown={() => move(i, 1)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableTeam({
  id,
  position,
  name,
  flag,
  disabled,
  onUp,
  onDown,
}: {
  id: number;
  position: number;
  name: string;
  flag: string | null;
  disabled: boolean;
  onUp: () => void;
  onDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded border bg-white px-2 py-1.5 text-sm ${
        isDragging ? "z-10 border-emerald-400 shadow-md" : "border-slate-200"
      }`}
    >
      <span
        className={`w-5 text-center text-xs font-bold ${
          position <= 2 ? "text-emerald-600" : "text-slate-400"
        }`}
      >
        {position}
      </span>
      <span
        {...attributes}
        {...listeners}
        className={`flex flex-1 items-center gap-2 ${disabled ? "" : "cursor-grab touch-none active:cursor-grabbing"}`}
      >
        {flag && <img src={flag} alt="" className="h-4 w-4 rounded-full object-cover" />}
        <span className="font-medium">{name}</span>
      </span>
      {!disabled && (
        <span className="flex gap-1">
          <button onClick={onUp} className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-100" aria-label="Move up">
            ↑
          </button>
          <button onClick={onDown} className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-100" aria-label="Move down">
            ↓
          </button>
        </span>
      )}
    </li>
  );
}
