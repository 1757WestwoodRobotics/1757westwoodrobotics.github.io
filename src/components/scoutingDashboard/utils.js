// Shared utility functions for scouting dashboard components

export function getVal(obj, key) {
if (!obj) return '';
if (typeof obj === 'object' && key in obj) return obj[key];
return '';
}

export function parseActions(actionStr) {
if (!actionStr || actionStr === 'N/A') return [];
return actionStr.split(';').map(act => {
const [meta, time] = act.split('@');
if (!meta || !time) return null;
const [code, type] = meta.split(':');
return { code, type, time: parseInt(time) };
}).filter(Boolean).sort((a, b) => a.time - b.time);
}

export function getGanttData(actionStr) {
const raw = parseActions(actionStr);
const groups = {};
const active = {};
raw.forEach(act => {
if (!groups[act.code]) groups[act.code] = [];
if (act.type === 'start') active[act.code] = act.time;
else if (act.type === 'stop') {
if (active[act.code] !== undefined) {
groups[act.code].push({ start: active[act.code], end: act.time, type: 'range' });
delete active[act.code];
}
} else groups[act.code].push({ time: act.time, type: 'point' });
});
Object.keys(active).forEach(code => groups[code].push({ start: active[code], end: 150, type: 'range' }));
return Object.entries(groups).map(([code, events]) => ({ code, events }));
}

export function getActionColor(code) {
if (code.includes('score')) return 'bg-green-500';
if (code.includes('coll') || code.includes('outpost') || code.includes('depot') || code.includes('ground')) return 'bg-blue-500';
if (code.includes('pass')) return 'bg-orange-500';
if (code.includes('climb')) return 'bg-purple-500';
if (code.includes('die')) return 'bg-red-500';
if (code.includes('card')) return 'bg-yellow-500';
if (code.includes('tip')) return 'bg-pink-500';
return 'bg-zinc-500';
}
