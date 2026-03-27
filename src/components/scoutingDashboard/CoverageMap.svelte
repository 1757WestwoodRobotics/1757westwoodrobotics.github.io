<script>
	import CoverageMapButton from './CoverageMapButton.svelte';

	export let schedule;
	export let hoveredMatch;
	export let searchTerm;
	export let getScouterCount;
	export let getMatchBreakdown;
	export let teamIsInMatch;
	export let onMatchClick;
	export let onMatchContextMenu;
	export let onMatchHover;
	export let onMatchHoverEnd;
</script>

<section class="mb-12 bg-zinc-900/30 border border-zinc-800 p-6 rounded-[2rem] backdrop-blur-sm relative">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Quals Coverage Map</h3>
		<div class="flex gap-4 text-[8px] font-bold uppercase text-zinc-600">
			<div class="flex items-center gap-1"><div class="w-2 h-2 bg-blue-600 rounded-sm"></div> Full (6)</div>
			<div class="flex items-center gap-1"><div class="w-2 h-2 bg-blue-900/40 rounded-sm"></div> Partial</div>
			<div class="flex items-center gap-1"><div class="w-2 h-2 bg-zinc-800 rounded-sm"></div> Missing</div>
		</div>
	</div>
	<div class="flex flex-wrap gap-1.5">
		{#each schedule as match}
			<CoverageMapButton
				{match}
				{hoveredMatch}
				{getScouterCount}
				{getMatchBreakdown}
				{teamIsInMatch}
				{searchTerm}
				onMatchClick={() => onMatchClick(match)}
				onMatchContextMenu={(e) => onMatchContextMenu(e, match)}
				onMatchHover={() => onMatchHover(match)}
				onMatchHoverEnd={() => onMatchHoverEnd()}
			/>
		{/each}
	</div>
</section>
