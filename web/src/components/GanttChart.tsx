import { useMemo, type RefObject } from 'react';
import type { PhaseNode, TodoStatus } from '../types';

interface GanttChartProps {
  phases: PhaseNode[];
  showWorksByPhase?: Record<string, boolean>;
  showTasksByWork?: Record<string, boolean>;
  showTodosByTask?: Record<string, boolean>;
  itemRects?: Record<string, { top: number; height: number }>;
  ganttOffset?: number;
  rowsRef?: RefObject<HTMLDivElement | null>;
}

type GanttRow = {
  id: string;
  label: string;
  start: number;
  end: number;
  status: TodoStatus;
  level: number;
};

type TodoMarker = {
  id: string;
  label: string;
  due: number;
  status: TodoStatus;
  taskId: string;
};

const STATUS_COLOR: Record<TodoStatus, string> = {
  NOT_STARTED: '#cbd5f5',
  IN_PROGRESS: '#38bdf8',
  DONE: '#22c55e',
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value: string): number | null {
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function formatDateLabel(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildRows(
  phases: PhaseNode[],
  showWorksByPhase: Record<string, boolean>,
  showTasksByWork: Record<string, boolean>,
): GanttRow[] {
  const rows: GanttRow[] = [];

  phases.forEach((phase) => {
    const phaseStart = parseDate(phase.plannedStart);
    const phaseEnd = parseDate(phase.plannedEnd);
    if (phaseStart && phaseEnd) {
      rows.push({
        id: phase.id,
        label: phase.title,
        start: phaseStart,
        end: Math.max(phaseStart, phaseEnd),
        status: phase.status,
        level: 0,
      });
    }

    if (showWorksByPhase[phase.id] === false) {
      return;
    }

    phase.works.forEach((work) => {
      const workStart = parseDate(work.plannedStart);
      const workEnd = parseDate(work.plannedEnd);
      if (workStart && workEnd) {
        rows.push({
          id: work.id,
          label: `└ ${work.title}`,
          start: workStart,
          end: Math.max(workStart, workEnd),
          status: work.status,
          level: 1,
        });
      }

      if (showTasksByWork[work.id] === false) {
        return;
      }

      work.tasks.forEach((task) => {
        const taskStart = parseDate(task.plannedStart);
        const taskEnd = parseDate(task.plannedEnd);
        if (taskStart && taskEnd) {
          rows.push({
            id: task.id,
            label: `　 └ ${task.title}`,
            start: taskStart,
            end: Math.max(taskStart, taskEnd),
            status: task.status,
            level: 2,
          });
        }
      });
    });
  });

  return rows;
}

function buildTicks(minStart: number, maxEnd: number) {
  const totalDays = Math.max(1, Math.ceil((maxEnd - minStart) / DAY_MS));
  const stepDays = totalDays > 180 ? 30 : totalDays > 90 ? 14 : 7;
  const ticks: { position: number; label: string }[] = [];

  const firstTick = new Date(minStart);
  firstTick.setHours(0, 0, 0, 0);

  for (let current = firstTick.getTime(); current <= maxEnd; current += stepDays * DAY_MS) {
    const position = ((current - minStart) / Math.max(maxEnd - minStart, DAY_MS)) * 100;
    ticks.push({
      position,
      label: formatDateLabel(current).slice(5),
    });
  }

  const lastPosition = 100;
  if (!ticks.some((tick) => Math.abs(tick.position - lastPosition) < 0.1)) {
    ticks.push({ position: lastPosition, label: formatDateLabel(maxEnd).slice(5) });
  }

  return ticks;
}

function clampPercent(value: number) {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export function GanttChart({
  phases,
  showWorksByPhase = {},
  showTasksByWork = {},
  showTodosByTask = {},
  itemRects,
  ganttOffset = 0,
  rowsRef,
}: GanttChartProps) {
  const rows = useMemo(
    () => buildRows(phases, showWorksByPhase, showTasksByWork),
    [phases, showWorksByPhase, showTasksByWork],
  );

  const todoMarkers = useMemo(() => {
    const items: TodoMarker[] = [];
    phases.forEach((phase) => {
      if (showWorksByPhase[phase.id] === false) return;
      phase.works.forEach((work) => {
        if (showTasksByWork[work.id] === false) return;
        work.tasks.forEach((task) => {
          if (showTodosByTask[task.id] === false) return;
          task.todos.forEach((todo) => {
            const due = todo.dueDate ? parseDate(todo.dueDate) : null;
            if (!due) return;
            items.push({
              id: todo.id,
              label: todo.title,
              due,
              status: todo.status,
              taskId: task.id,
            });
          });
        });
      });
    });
    return items;
  }, [phases, showWorksByPhase, showTasksByWork, showTodosByTask]);

  if (rows.length === 0) {
    return (
      <section className="gantt-card">
        <header className="gantt-header">
          <div>
            <p className="gantt-title">ガントチャート</p>
            <small className="gantt-sub">予定開始・終了が入力された項目のみ表示されます</small>
          </div>
        </header>
        <p className="empty">表示できるガントチャートのデータがありません。</p>
      </section>
    );
  }

  const minStart = Math.min(...rows.map((row) => row.start));
  const maxEnd = Math.max(...rows.map((row) => row.end));
  const range = Math.max(maxEnd - minStart, DAY_MS);
  const ticks = buildTicks(minStart, maxEnd);
  const today = Date.now();
  const showToday = today >= minStart - DAY_MS && today <= maxEnd + DAY_MS;
  const todayPosition = clampPercent(((today - minStart) / range) * 100);
  const hasMeasurements = itemRects && Object.keys(itemRects).length > 0;
  const baseRowHeight =
    typeof window !== 'undefined'
      ? parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--plan-row-height') || '48',
        10,
      )
      : 48;
  const rowGap =
    typeof window !== 'undefined'
      ? parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--plan-row-gap') || '12',
        10,
      )
      : 12;

  const fallbackPositions = useMemo(() => {
    const map: Record<string, { top: number; height: number }> = {};
    rows.forEach((row, index) => {
      map[row.id] = {
        top: index * (baseRowHeight + rowGap),
        height: baseRowHeight,
      };
    });
    return map;
  }, [rows, baseRowHeight, rowGap]);
  let measuredHeight: number | undefined;
  if (hasMeasurements && itemRects) {
    const candidates: number[] = [];
    Object.values(itemRects).forEach((rect) => {
      candidates.push(rect.top + ganttOffset + rect.height);
    });
    if (candidates.length === 0) {
      candidates.push((rows.length || 1) * (baseRowHeight + rowGap));
    }
    measuredHeight = Math.max(...candidates);
  } else if (rows.length > 0) {
    measuredHeight = (rows.length - 1) * (baseRowHeight + rowGap) + baseRowHeight;
  }

  function getPosition(id: string) {
    const rect = itemRects?.[id];
    if (rect) {
      return { top: rect.top + ganttOffset, height: rect.height };
    }
    if (fallbackPositions[id]) {
      return fallbackPositions[id];
    }
    return undefined;
  }

  return (
    <section className="gantt-card">
      <header className="gantt-header">
        <div>
          <p className="gantt-title">ガントチャート</p>
          <small className="gantt-sub">右側に期間軸を揃えています（週〜月単位の目盛り）</small>
        </div>
        <div className="gantt-legend">
          <span className="legend-dot legend-not-started" />
          <span>未着手</span>
          <span className="legend-dot legend-in-progress" />
          <span>進行中</span>
          <span className="legend-dot legend-done" />
          <span>完了</span>
        </div>
      </header>
      <div className="gantt-scale">
        {ticks.map((tick, index) => (
          <div key={`${tick.label}-${index}`} className="gantt-tick" style={{ left: `${tick.position}%` }}>
            <span>{tick.label}</span>
          </div>
        ))}
        {showToday && <div className="gantt-today" style={{ left: `${todayPosition}%` }} aria-label="今日" />}
      </div>
      <div
        className="gantt-rows"
        ref={rowsRef}
        style={measuredHeight ? { position: 'relative', height: measuredHeight } : undefined}
      >
        {rows.map((row) => {
          const left = clampPercent(((row.start - minStart) / range) * 100);
          const width = Math.max(((row.end - row.start) / range) * 100, 1.5);
          const pos = getPosition(row.id);
          const rowStyle =
            pos && measuredHeight
              ? {
                position: 'absolute' as const,
                top: pos.top,
                height: pos.height,
                left: 0,
                right: 0,
              }
              : undefined;
          const trackHeight = pos ? Math.max(pos.height - 12, 20) : undefined;

          return (
            <div key={row.id} className="gantt-row" style={rowStyle}>
              <div className={`gantt-label level-${row.level}`}>{row.label}</div>
              <div
                className="gantt-track"
                aria-label={`${row.label}の期間`}
                style={trackHeight ? { height: trackHeight } : undefined}
              >
                <div className="gantt-grid-lines">
                  {ticks.map((tick, index) => (
                    <div
                      key={`${row.id}-line-${index}`}
                      className="gantt-grid-line"
                      style={{ left: `${tick.position}%` }}
                    />
                  ))}
                  {showToday && <div className="gantt-today" style={{ left: `${todayPosition}%` }} />}
                </div>
                <div
                  className="gantt-bar"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background: STATUS_COLOR[row.status],
                  }}
                  title={`${row.label}\n${formatDateLabel(row.start)} 〜 ${formatDateLabel(row.end)}`}
                >
                  <span className="gantt-bar-text">
                    {formatDateLabel(row.start).slice(5)} - {formatDateLabel(row.end).slice(5)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {todoMarkers.map((marker) => {
          const todoPos = getPosition(`todo-${marker.id}`);
          const taskPos = getPosition(marker.taskId);
          const pos = todoPos ?? taskPos;
          if (!pos) return null;
          const left = clampPercent(((marker.due - minStart) / range) * 100);
          const top = pos.top + pos.height / 2;
          return (
            <div
              key={marker.id}
              className={`gantt-marker marker-${marker.status.toLowerCase()}`}
              style={{ left: `${left}%`, top }}
              title={`${marker.label}\n期限: ${formatDateLabel(marker.due)}`}
            />
          );
        })}
      </div>
    </section>
  );
}
