import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSocket } from '../../services/socket';
import type { WorkspaceMember, WorkspaceRole } from '../../services/workspaceApi';
import { workspaceProjectApi } from '../../services/workspaceProjectApi';
import type { BoardPriority, BoardProject, BoardStatus, BoardTask, BoardTaskInput } from '../../services/workspaceProjectApi';

const columns: { status: BoardStatus; label: string; accent: string }[] = [
  { status: 'TODO', label: 'To Do', accent: 'border-slate-400' },
  { status: 'IN_PROGRESS', label: 'In Progress', accent: 'border-violet-500' },
  { status: 'DONE', label: 'Done', accent: 'border-emerald-500' },
];
const priorityColor: Record<BoardPriority, string> = { LOW: 'text-slate-400', MEDIUM: 'text-blue-400', HIGH: 'text-amber-400', URGENT: 'text-red-400' };

interface Props { workspaceId: string; members: WorkspaceMember[]; role?: WorkspaceRole; }
const emptyTask = { title: '', description: '', assigneeId: '', priority: 'MEDIUM' as BoardPriority, dueDate: '' };

export default function WorkspaceProjectBoard({ workspaceId, members, role }: Props) {
  const [projects, setProjects] = useState<BoardProject[]>([]);
  const [projectId, setProjectId] = useState('');
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [editing, setEditing] = useState<BoardTask | null | false>(false);
  const [form, setForm] = useState(emptyTask);
  const [saving, setSaving] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [editingProject, setEditingProject] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const canManageProject = role === 'owner' || role === 'admin';
  const canManageTasks = role !== 'viewer';

  const loadProjects = useCallback(async () => {
    try {
      const { projects: rows } = await workspaceProjectApi.listProjects(workspaceId);
      setProjects(rows);
      setProjectId((current) => rows.some((p) => p.id === current) ? current : rows[0]?.id || '');
      setError('');
    } catch { setError('Could not load workspace projects. Please try again.'); }
    finally { setLoading(false); }
  }, [workspaceId]);
  const loadTasks = useCallback(async () => {
    if (!projectId) { setTasks([]); return; }
    try { const { tasks: rows } = await workspaceProjectApi.listTasks(workspaceId, projectId); setTasks(rows); setError(''); }
    catch { setError('Could not load project tasks. Please try again.'); }
  }, [workspaceId, projectId]);

  useEffect(() => { void loadProjects(); }, [loadProjects]);
  useEffect(() => { void loadTasks(); }, [loadTasks]);
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refresh = (event: { workspaceId?: string }) => { if (!event?.workspaceId || event.workspaceId === workspaceId) { void loadProjects(); void loadTasks(); } };
    const deletedProject = (event: { workspaceId?: string }) => { if (!event?.workspaceId || event.workspaceId === workspaceId) { void loadProjects(); void loadTasks(); } };
    const events = ['workspace:project:created', 'workspace:project:updated', 'workspace:task:created', 'workspace:task:updated', 'workspace:task:deleted'];
    events.forEach((event) => socket.on(event, refresh));
    socket.on('workspace:project:deleted', deletedProject);
    const onConnect = () => refresh({});
    socket.on('connect', onConnect);
    return () => { events.forEach((event) => socket.off(event, refresh)); socket.off('workspace:project:deleted', deletedProject); socket.off('connect', onConnect); };
  }, [workspaceId, loadProjects, loadTasks]);

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const term = search.trim().toLowerCase();
    const matchesText = !term || `${task.title} ${task.description} ${task.assignee?.firstName || ''} ${task.assignee?.lastName || ''}`.toLowerCase().includes(term);
    return matchesText && (priorityFilter === 'ALL' || task.priority === priorityFilter);
  }), [tasks, search, priorityFilter]);

  const openCreate = () => { setEditing(null); setForm(emptyTask); setError(''); };
  const openEdit = (task: BoardTask) => { setEditing(task); setForm({ title: task.title, description: task.description, assigneeId: task.assigneeId || '', priority: task.priority, dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '' }); setError(''); };
  const closeModal = () => setEditing(false);
  const saveTask = async (event: React.FormEvent) => {
    event.preventDefault(); if (!projectId) return;
    setSaving(true); setError('');
    const input: BoardTaskInput = { ...form, assigneeId: form.assigneeId || null, dueDate: form.dueDate || null, ...(editing ? { status: editing.status } : {}) };
    try {
      if (editing) await workspaceProjectApi.updateTask(workspaceId, projectId, editing.id, input);
      else await workspaceProjectApi.createTask(workspaceId, projectId, input);
      setEditing(false); await loadTasks();
    } catch { setError('Could not save the task. Check your access and try again.'); }
    finally { setSaving(false); }
  };
  const moveTask = async (task: BoardTask, status: BoardStatus) => {
    if (!canManageTasks || task.status === status) return;
    try { await workspaceProjectApi.updateTask(workspaceId, task.projectId, task.id, { status }); await loadTasks(); }
    catch { setError('Could not update task status. Please try again.'); }
  };
  const deleteTask = async (task: BoardTask) => {
    if (!projectId || !confirm(`Delete “${task.title}”?`)) return;
    try { await workspaceProjectApi.deleteTask(workspaceId, projectId, task.id); await loadTasks(); }
    catch { setError('Could not delete the task. Please try again.'); }
  };
  const saveProject = async (event: React.FormEvent) => {
    event.preventDefault(); if (!projectName.trim()) return;
    try {
      if (editingProject && projectId) await workspaceProjectApi.updateProject(workspaceId, projectId, { name: projectName.trim(), description: projectDescription.trim() });
      else { const { project } = await workspaceProjectApi.createProject(workspaceId, { name: projectName.trim(), description: projectDescription.trim() }); setProjectId(project.id); }
      setProjectName(''); setProjectDescription(''); setShowProjectForm(false); setEditingProject(false); await loadProjects();
    } catch { setError(`Could not ${editingProject ? 'update' : 'create'} the project. Please try again.`); }
  };
  const beginEditProject = () => { const selected = projects.find((project) => project.id === projectId); if (!selected) return; setProjectName(selected.name); setProjectDescription(selected.description); setEditingProject(true); setShowProjectForm(true); };
  const removeProject = async () => { const selected = projects.find((project) => project.id === projectId); if (!selected || !confirm(`Delete project “${selected.name}” and all its tasks?`)) return; try { await workspaceProjectApi.deleteProject(workspaceId, selected.id); await loadProjects(); } catch { setError('Could not delete the project. Please try again.'); } };

  return <section className="space-y-5" aria-label="Workspace project board">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <label className="sr-only" htmlFor="board-project">Project</label>
        <select id="board-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="min-w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151522] px-3 py-2.5 text-sm text-slate-900 dark:text-white">
          {!projects.length && <option value="">No projects yet</option>}{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        {canManageProject && <div className="flex gap-2"><button type="button" onClick={() => { if (showProjectForm) { setShowProjectForm(false); setEditingProject(false); } else { setEditingProject(false); setProjectName(''); setProjectDescription(''); setShowProjectForm(true); } }} className="rounded-xl border border-purple-200 dark:border-purple-900 px-3 py-2 text-sm font-medium text-purple-700 dark:text-purple-300">{showProjectForm ? 'Cancel' : 'New Project'}</button>{projectId && <><button type="button" onClick={beginEditProject} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">Edit project</button><button type="button" onClick={() => void removeProject()} className="rounded-xl border border-red-200 dark:border-red-900/60 px-3 py-2 text-sm text-red-600 dark:text-red-400">Delete project</button></>}</div>}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="sr-only" htmlFor="board-search">Search tasks</label><input id="board-search" type="search" placeholder="Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151522] px-3 py-2 text-sm text-slate-900 dark:text-white" />
        <label className="sr-only" htmlFor="board-priority">Filter by priority</label><select id="board-priority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151522] px-3 py-2 text-sm text-slate-900 dark:text-white"><option value="ALL">All priorities</option>{(['LOW','MEDIUM','HIGH','URGENT'] as BoardPriority[]).map((p) => <option key={p} value={p}>{p}</option>)}</select>
        {canManageTasks && <button type="button" onClick={openCreate} disabled={!projectId} className="rounded-xl bg-[#6D28D9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Create task</button>}
      </div>
    </div>
    {showProjectForm && <form onSubmit={saveProject} className="grid gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151522] p-4 sm:grid-cols-[1fr_2fr_auto]"><label className="sr-only" htmlFor="new-project-name">Project name</label><input id="new-project-name" autoFocus required maxLength={120} value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project name" className="min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-white"/><label className="sr-only" htmlFor="new-project-description">Project description</label><input id="new-project-description" maxLength={2000} value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder="Description (optional)" className="min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-white"/><button className="rounded-lg bg-[#6D28D9] px-4 py-2 text-sm font-semibold text-white">{editingProject ? 'Save project' : 'Create project'}</button></form>}
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
    {loading ? <div role="status" className="py-16 text-center text-sm text-slate-500">Loading projects…</div> : !projects.length ? <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-sm text-slate-500">No projects yet. Workspace admins can create the first project.</div> : <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {columns.map((column) => <div key={column.status} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const task = tasks.find((item) => item.id === e.dataTransfer.getData('text/task-id')); if (task) void moveTask(task, column.status); }} className={`min-h-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#11111B] p-3`}>
        <div className={`mb-3 flex items-center justify-between border-t-2 ${column.accent} pt-3`}><h3 className="font-semibold text-slate-900 dark:text-white">{column.label}</h3><span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300">{visibleTasks.filter((task) => task.status === column.status).length}</span></div>
        <div className="space-y-3">{visibleTasks.filter((task) => task.status === column.status).map((task) => <article key={task.id} draggable={canManageTasks} onDragStart={(e) => e.dataTransfer.setData('text/task-id', task.id)} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#191927] p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2"><button type="button" onClick={() => openEdit(task)} className="text-left font-semibold text-slate-900 dark:text-white hover:text-purple-600">{task.title}</button><span className={`shrink-0 text-[10px] font-bold tracking-wide ${priorityColor[task.priority]}`}>{task.priority}</span></div>
          {task.description && <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-slate-600 dark:text-slate-400">{task.description}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-500 dark:text-slate-400"><span>{task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned'}</span><span className={task.dueDate && new Date(task.dueDate).getTime() < Date.now() && task.status !== 'DONE' ? 'text-red-500' : ''}>{task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString()}` : 'No due date'}</span></div>
          <div className="mt-3 flex items-center justify-between"><label className="sr-only" htmlFor={`status-${task.id}`}>Task status</label><select id={`status-${task.id}`} disabled={!canManageTasks} value={task.status} onChange={(e) => void moveTask(task, e.target.value as BoardStatus)} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-2 py-1 text-xs text-slate-700 dark:text-slate-300">{columns.map((item) => <option value={item.status} key={item.status}>{item.label}</option>)}</select>{canManageTasks && <button type="button" onClick={() => void deleteTask(task)} className="text-xs text-red-500 hover:text-red-700">Delete</button>}</div>
        </article>)}</div>
      </div>)}
    </div>}
    {editing !== false && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}><form onSubmit={saveTask} role="dialog" aria-modal="true" aria-labelledby="task-modal-title" className="my-auto w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151522] p-6 shadow-2xl">
      <div className="flex items-center justify-between"><h2 id="task-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">{editing ? 'Edit task' : 'Create task'}</h2><button type="button" onClick={closeModal} aria-label="Close task form" className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">✕</button></div>
      <label className="block text-sm text-slate-700 dark:text-slate-300">Title<input required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-slate-900 dark:text-white" /></label>
      <label className="block text-sm text-slate-700 dark:text-slate-300">Description<textarea maxLength={5000} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full resize-y rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-slate-900 dark:text-white" /></label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><label className="text-sm text-slate-700 dark:text-slate-300">Assignee<select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0B14] px-2 py-2 text-xs text-slate-900 dark:text-white"><option value="">Unassigned</option>{members.map((m) => <option key={m.userId} value={m.userId}>{m.firstName} {m.lastName}</option>)}</select></label><label className="text-sm text-slate-700 dark:text-slate-300">Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as BoardPriority })} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0B14] px-2 py-2 text-xs text-slate-900 dark:text-white">{(['LOW','MEDIUM','HIGH','URGENT'] as BoardPriority[]).map((p) => <option key={p}>{p}</option>)}</select></label><label className="text-sm text-slate-700 dark:text-slate-300">Due date<input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0B14] px-2 py-2 text-xs text-slate-900 dark:text-white" /></label></div>
      {editing && <label className="block text-sm text-slate-700 dark:text-slate-300">Status<select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as BoardStatus })} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0B14] px-3 py-2 text-slate-900 dark:text-white">{columns.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}</select></label>}
      <div className="flex justify-end gap-2"><button type="button" onClick={closeModal} className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm text-slate-700 dark:text-slate-300">Cancel</button><button disabled={saving} className="rounded-lg bg-[#6D28D9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save task'}</button></div>
    </form></div>}
  </section>;
}
