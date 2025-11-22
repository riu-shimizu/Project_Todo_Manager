import { useMemo, useRef, useEffect } from 'react';
import type { PhaseNode, TodoStatus } from '../types';

interface GanttChartProps {
  phases: PhaseNode[];
  showWorksByPhase?: Record<string, boolean>;
  showTasksByWork?: Record<string, boolean>;
  showTodosByTask?: Record<string, boolean>;
}

type GanttRow = {
  id: string;
  label: string;
  plannedStart: number | null;
  plannedEnd: number | null;
  actualStart: number | null;
  actualEnd: number | null;
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

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_WIDTH = 40; // Fixed width per day in pixels

function parseDate(value: string | undefined | null): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function buildRows(
  phases: PhaseNode[],
  showWorksByPhase: Record<string, boolean>,
  showTasksByWork: Record<string, boolean>,
): GanttRow[] {
  const rows: GanttRow[] = [];

  phases.forEach((phase) => {
    const plannedStart = parseDate(phase.plannedStart);
    const plannedEnd = parseDate(phase.plannedEnd);
    const actualStart = parseDate(phase.actualStart);
    const actualEnd = parseDate(phase.actualEnd);

    rows.push({
      id: phase.id,
      label: phase.title,
      plannedStart,
      plannedEnd: plannedEnd ? Math.max(plannedStart ?? 0, plannedEnd) : null,
      actualStart,
      actualEnd: actualEnd ? Math.max(actualStart ?? 0, actualEnd) : null,
      status: phase.status,
      level: 0,
    });

    if (showWorksByPhase[phase.id] === false) return;

    phase.works.forEach((work) => {
      const plannedStart = parseDate(work.plannedStart);
      const plannedEnd = parseDate(work.plannedEnd);
      const actualStart = parseDate(work.actualStart);
      const actualEnd = parseDate(work.actualEnd);

      rows.push({
        id: work.id,
        label: `└ ${work.title}`,
        plannedStart,
        plannedEnd: plannedEnd ? Math.max(plannedStart ?? 0, plannedEnd) : null,
        actualStart,
        actualEnd: actualEnd ? Math.max(actualStart ?? 0, actualEnd) : null,
        status: work.status,
        level: 1,
      });

      if (showTasksByWork[work.id] === false) return;

      work.tasks.forEach((task) => {
        const plannedStart = parseDate(task.plannedStart);
        const plannedEnd = parseDate(task.plannedEnd);
        const actualStart = parseDate(task.actualStart);
        const actualEnd = parseDate(task.actualEnd);

        rows.push({
          id: task.id,
          label: `　 └ ${task.title}`,
          plannedStart,
          plannedEnd: plannedEnd ? Math.max(plannedStart ?? 0, plannedEnd) : null,
          actualStart,
          actualEnd: actualEnd ? Math.max(actualStart ?? 0, actualEnd) : null,
          status: task.status,
          level: 2,
        });
      });
    });
  });

  return rows;
}

export function GanttChart({
  phases,
  showWorksByPhase = {},
  showTasksByWork = {},
  showTodosByTask = {},
}: GanttChartProps) {
  const rows = useMemo(
    () => {
      if (!phases) return [];
      return buildRows(phases, showWorksByPhase, showTasksByWork);
    },
    [phases, showWorksByPhase, showTasksByWork],
  );

  const todoMarkers = useMemo(() => {
    const items: TodoMarker[] = [];
    phases?.forEach((phase) => {
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

  // Calculate timeline bounds
  const { minStart, maxEnd, totalDays } = useMemo(() => {
    if (rows.length === 0) return { minStart: Date.now(), maxEnd: Date.now(), totalDays: 1 };

    let min = Infinity;
    let max = -Infinity;

    rows.forEach(row => {
      if (row.plannedStart) min = Math.min(min, row.plannedStart);
      if (row.actualStart) min = Math.min(min, row.actualStart);
      if (row.plannedEnd) max = Math.max(max, row.plannedEnd);
      if (row.actualEnd) max = Math.max(max, row.actualEnd);
    });

    todoMarkers.forEach(m => {
      min = Math.min(min, m.due);
      max = Math.max(max, m.due);
    });

    if (min === Infinity) {
      min = Date.now();
      max = Date.now() + 7 * DAY_MS;
    }

    // Add padding
    min -= 3 * DAY_MS;
    max += 7 * DAY_MS;

    // Align to start of day
    const startDate = new Date(min);
    startDate.setHours(0, 0, 0, 0);
    const startTs = startDate.getTime();

    const endDate = new Date(max);
    endDate.setHours(0, 0, 0, 0);
    const endTs = endDate.getTime();

    return {
      minStart: startTs,
      maxEnd: endTs,
      totalDays: Math.ceil((endTs - startTs) / DAY_MS) + 1,
    };
  }, [rows, todoMarkers]);

  const timelineWidth = totalDays * DAY_WIDTH;

  // Generate header data
  const headerData = useMemo(() => {
    const months: { label: string; width: number }[] = [];
    const days: { label: string; isWeekend: boolean }[] = [];

    let current = new Date(minStart);
    let currentMonth = current.getMonth();
    let currentMonthWidth = 0;
    let currentMonthLabel = `${current.getFullYear()}年${current.getMonth() + 1}月`;

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(minStart + i * DAY_MS);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      days.push({
        label: `${d.getDate()}`,
        isWeekend,
      });

      if (d.getMonth() !== currentMonth) {
        months.push({ label: currentMonthLabel, width: currentMonthWidth });
        currentMonth = d.getMonth();
        currentMonthLabel = `${d.getFullYear()}年${d.getMonth() + 1}月`;
        currentMonthWidth = 0;
      }
      currentMonthWidth += DAY_WIDTH;
    }
    months.push({ label: currentMonthLabel, width: currentMonthWidth });

    return { months, days };
  }, [minStart, totalDays]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const today = Date.now();
      const diff = today - minStart;
      if (diff > 0) {
        const px = (diff / DAY_MS) * DAY_WIDTH - 200; // Offset to center a bit
        scrollRef.current.scrollLeft = px;
      }
    }
  }, [minStart]);

  if (rows.length === 0) {
    return (
      <section className="gantt-card">
        <p className="empty">表示できるデータがありません。</p>
      </section>
    );
  }

  const today = Date.now();
  const todayLeft = ((today - minStart) / DAY_MS) * DAY_WIDTH;

  return (
    <section className="gantt-card">
      <div className="gantt-header">
        <div>
          <p className="gantt-title">ガントチャート</p>
          <small className="gantt-sub">横スクロールで期間を確認できます</small>
        </div>
        <div className="gantt-legend">
          <span className="legend-dot" style={{ background: '#cbd5e1' }} />
          <span>予定</span>
          <span className="legend-dot legend-not-started" />
          <span>未着手</span>
          <span className="legend-dot legend-in-progress" />
          <span>進行中</span>
          <span className="legend-dot legend-done" />
          <span>完了</span>
        </div>
      </div>

      <div className="gantt-container">
        {/* Sidebar */}
        <div className="gantt-sidebar">
          <div className="gantt-sidebar-header">タスク名</div>
          {rows.map((row) => (
            <div key={row.id} className={`gantt-sidebar-row level-${row.level}`} title={row.label}>
              {row.label}
            </div>
          ))}
        </div>

        {/* Scrollable Timeline */}
        <div className="gantt-timeline-scroll" ref={scrollRef}>
          <div style={{ width: timelineWidth }}>
            {/* Header */}
            <div className="gantt-timeline-header">
              <div className="gantt-header-row-top">
                {headerData.months.map((m, i) => (
                  <div key={i} className="gantt-header-cell" style={{ width: m.width, justifyContent: 'flex-start', paddingLeft: 8 }}>
                    {m.label}
                  </div>
                ))}
              </div>
              <div className="gantt-header-row-bottom">
                {headerData.days.map((d, i) => (
                  <div
                    key={i}
                    className="gantt-header-cell"
                    style={{ width: DAY_WIDTH, background: d.isWeekend ? '#f8fafc' : 'transparent' }}
                  >
                    {d.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="gantt-body">
              {/* Grid Columns (Background) */}
              {headerData.days.map((d, i) => (
                <div
                  key={i}
                  className={`gantt-grid-col ${d.isWeekend ? 'weekend' : ''}`}
                  style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                />
              ))}

              {/* Today Line */}
              {today >= minStart && today <= maxEnd && (
                <div className="gantt-today-line" style={{ left: todayLeft }} title="今日" />
              )}

              {/* Rows */}
              {rows.map((row) => {
                const plannedLeft = row.plannedStart ? ((row.plannedStart - minStart) / DAY_MS) * DAY_WIDTH : 0;
                const plannedWidth = (row.plannedStart && row.plannedEnd)
                  ? Math.max(((row.plannedEnd - row.plannedStart) / DAY_MS) * DAY_WIDTH, DAY_WIDTH / 2)
                  : 0;

                const actualLeft = row.actualStart ? ((row.actualStart - minStart) / DAY_MS) * DAY_WIDTH : 0;
                const actualWidth = (row.actualStart && row.actualEnd)
                  ? Math.max(((row.actualEnd - row.actualStart) / DAY_MS) * DAY_WIDTH, DAY_WIDTH / 2)
                  : 0;

                return (
                  <div key={row.id} className="gantt-body-row">
                    {/* Planned Bar */}
                    {row.plannedStart && row.plannedEnd && (
                      <div
                        className="gantt-bar-planned"
                        style={{ left: plannedLeft, width: plannedWidth }}
                        title={`予定: ${new Date(row.plannedStart).toLocaleDateString()} - ${new Date(row.plannedEnd).toLocaleDateString()}`}
                      />
                    )}
                    {/* Actual Bar */}
                    {row.actualStart && row.actualEnd && (
                      <div
                        className={`gantt-bar-actual marker-${row.status.toLowerCase()}`}
                        style={{ left: actualLeft, width: actualWidth }}
                        title={`実績: ${new Date(row.actualStart).toLocaleDateString()} - ${new Date(row.actualEnd).toLocaleDateString()}`}
                      />
                    )}
                  </div>
                );
              })}

              {/* Todo Markers */}
              {todoMarkers.map((marker) => {
                const rowIndex = rows.findIndex(r => r.id === marker.taskId || r.id === `todo-${marker.id}`); // Note: markers are usually on task row
                // Find the row index for the task this todo belongs to
                const taskRowIndex = rows.findIndex(r => r.id === marker.taskId);
                if (taskRowIndex === -1) return null;

                const left = ((marker.due - minStart) / DAY_MS) * DAY_WIDTH;
                const top = taskRowIndex * 48 + 24; // Center of the row (48px height)

                return (
                  <div
                    key={marker.id}
                    className={`gantt-marker marker-${marker.status.toLowerCase()}`}
                    style={{ left, top }}
                    title={`Todo: ${marker.label} (${new Date(marker.due).toLocaleDateString()})`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
