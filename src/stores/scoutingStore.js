import { writable } from 'svelte/store';

// Data stores
export const scoutingData = writable([]);
export const pitData = writable([]);
export const schedule = writable([]);
export const eventOprs = writable({});
export const teamStatsMap = writable(new Map());
export const teamColorsMap = writable(new Map());
export const teamDetailsMap = writable(new Map());
export const matchResultsMap = writable(new Map());

// UI State stores
export const pitMode = writable(false);
export const simulatorMode = writable(false);
export const selectionMode = writable(false);
export const defenseMode = writable(false);

// Simulator teams
export const simRedTeams = writable(['', '', '']);
export const simBlueTeams = writable(['', '', '']);

// Video sync
export const videoCurrentTime = writable(0);
export const videosCollapsed = writable(false);

// Context menu
export const contextMenu = writable(null);
export const contextMenuMatch = writable(null);

// Selected row/match
export const selectedRow = writable(null);
export const selectedMatchPopup = writable(null);
export const hoveredMatch = writable(null);

// Loading state
export const loading = writable(true);
export const loadingSteps = writable({
	scoutingData: false,
	pitData: false,
	eventStats: false,
	schedule: false,
	teamStats: false
});
export const currentStep = writable('');
export const error = writable(null);
