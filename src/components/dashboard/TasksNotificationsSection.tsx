'use client';

import useSWR from 'swr';
import { Card, CardBody, CardHeader, Badge } from '@/components/ui';
import { BellIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import apiService from '@/lib/apiService';

// ── Real Task model (GET /tasks?mine=true) ──
export interface Task {
    id: number;
    title: string;
    description?: string | null;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    category?: string | null;
    deadline?: string | null;
    progress?: number | null;
}

interface TaskCounters {
    pending: number;
    in_progress: number;
    overdue: number;
}

interface UnreadBreakdown {
    total: number;
    by_category: { category: string; count: number }[];
}

const fetcher = (url: string) => apiService.get(url);

const formatLabel = (value: string) =>
    value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const priorityColor = (priority: string): 'red' | 'yellow' | 'gray' => {
    if (priority === 'HIGH' || priority === 'URGENT') return 'red';
    if (priority === 'MEDIUM') return 'yellow';
    return 'gray';
};

/**
 * "My Tasks" + "Unread Notifications" cards, shared by every role's overview.
 * Both widgets fail soft: if the tasks/notifications APIs are unavailable the
 * cards simply show their empty states.
 */
export function TasksNotificationsSection() {
    const { data: tasksRes, mutate: mutateTasks } = useSWR<{ data?: Task[] }>(
        '/tasks?mine=true&limit=10',
        fetcher,
        { onError: () => { /* fail soft */ } }
    );
    const { data: countersRes, mutate: mutateCounters } = useSWR<{ data?: TaskCounters }>(
        '/tasks/me/counters',
        fetcher,
        { onError: () => { /* fail soft */ } }
    );
    const { data: unreadRes } = useSWR<{ data?: UnreadBreakdown }>(
        '/notifications/me/unread-breakdown',
        fetcher,
        { onError: () => { /* fail soft */ } }
    );

    // Some list endpoints return the array directly, others nest it as data.data.
    const rawTasks = tasksRes?.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taskList: Task[] = Array.isArray(rawTasks) ? rawTasks : ((rawTasks as any)?.data ?? []);
    const myTasks = (Array.isArray(taskList) ? taskList : []).filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
    const counters = countersRes?.data;
    const unread = unreadRes?.data;
    const unreadCategories = Array.isArray(unread?.by_category) ? unread.by_category : [];

    const updateTaskStatus = async (task: Task, status: 'IN_PROGRESS' | 'COMPLETED') => {
        try {
            await apiService.patch(`/tasks/${task.id}`, { status });
            toast.success(status === 'COMPLETED' ? 'Task completed.' : 'Task started.');
            mutateTasks();
            mutateCounters();
        } catch (error) {
            console.error('Task update failed:', error);
            toast.error('Failed to update task.');
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
            {/* My Tasks */}
            <Card>
                <CardHeader className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        <ClipboardDocumentListIcon className="h-5 w-5 text-gray-400" />
                        My Tasks
                    </h3>
                    <div className="flex gap-2">
                        {counters && counters.overdue > 0 && <Badge color="red" size="sm">{counters.overdue} overdue</Badge>}
                        {counters && <Badge color="yellow" size="sm">{counters.pending} pending</Badge>}
                        {counters && <Badge color="blue" size="sm">{counters.in_progress} in progress</Badge>}
                    </div>
                </CardHeader>
                <CardBody>
                    {myTasks.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No open tasks. 🎉</p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {myTasks.slice(0, 6).map((task) => (
                                <li key={task.id} className="py-2.5 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {task.deadline ? `Due ${new Date(task.deadline).toLocaleDateString()}` : 'No deadline'}
                                            {typeof task.progress === 'number' ? ` · ${task.progress}% done` : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge color={priorityColor(task.priority)} size="sm">{formatLabel(task.priority)}</Badge>
                                        {task.status === 'PENDING' ? (
                                            <button
                                                onClick={() => updateTaskStatus(task, 'IN_PROGRESS')}
                                                className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                                            >
                                                Start
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => updateTaskStatus(task, 'COMPLETED')}
                                                className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700 hover:bg-green-200"
                                            >
                                                Complete
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardBody>
            </Card>

            {/* Unread notifications by category */}
            <Card>
                <CardHeader className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        <BellIcon className="h-5 w-5 text-gray-400" />
                        Unread Notifications
                    </h3>
                    {unread && <Badge color={unread.total > 0 ? 'red' : 'gray'} size="sm">{unread.total}</Badge>}
                </CardHeader>
                <CardBody>
                    {!unread || unread.total === 0 ? (
                        <p className="text-gray-500 text-center py-4">You&apos;re all caught up.</p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {unreadCategories.map((cat) => (
                                <li key={cat.category} className="py-2 flex items-center justify-between gap-2">
                                    <span className="text-sm text-gray-700">{formatLabel(cat.category)}</span>
                                    <span className="text-sm font-semibold text-gray-900">{cat.count}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}

export default TasksNotificationsSection;
