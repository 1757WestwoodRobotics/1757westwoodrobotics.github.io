<script>
	export let schedule = [];
	export let hoveredMatch = null;
	export let matchPredictions = [];
	export let hasOverrides = false;
	export let onMatchClick = () => {};
	export let onMatchLongPress = () => {};
	export let onMatchContextMenu = () => {};
	export let onMatchHover = () => {};
	export let onMatchHoverEnd = () => {};
	export let onClearOverrides = () => {};

	// Build a reactive map from matchPredictions so Svelte tracks changes
	$: predMap = new Map(matchPredictions.map(p => [p.match_number, p]));

	// Combine schedule + predictions into a single reactive array
	$: matchCards = schedule.map(match => {
		const pred = predMap.get(match.match_number) || null;
		let cardClass = 'bg-zinc-800 border-zinc-700';
		if (pred) {
			if (pred.played) {
				cardClass = pred.winner === 'red' ? 'bg-red-500/50 border-red-500/40'
					: pred.winner === 'blue' ? 'bg-blue-500/50 border-blue-500/40'
					: 'bg-zinc-600 border-zinc-500';
			} else if (pred.override) {
				cardClass = pred.override === 'red'
					? 'bg-red-500 border-yellow-400 ring-2 ring-yellow-400 shadow-md shadow-yellow-400/40'
					: 'bg-blue-500 border-yellow-400 ring-2 ring-yellow-400 shadow-md shadow-yellow-400/40';
			} else if (pred.predicted === 'red') {
				cardClass = 'bg-red-500 border-red-400 shadow-sm shadow-red-500/20';
			} else if (pred.predicted === 'blue') {
				cardClass = 'bg-blue-500 border-blue-400 shadow-sm shadow-blue-500/20';
			} else if (pred.predicted === 'tossup') {
				cardClass = 'bg-zinc-400/30 border-zinc-400/50';
			}
		}
		return { match, pred, cardClass };
	});

	function getTooltipText(pred) {
		if (!pred) return '';
		if (pred.played) {
			return `${pred.redScore} - ${pred.blueScore}`;
		}
		let text = '';
		if (pred.winProb !== undefined) {
			const redPct = (pred.winProb * 100).toFixed(0);
			const bluePct = (100 - pred.winProb * 100).toFixed(0);
			text = `Red ${redPct}% / Blue ${bluePct}%`;
		}
		if (pred.override) {
			text += ` (Override: ${pred.override})`;
		}
		return text;
	}

	let longPressTimer;
	let longPressTriggered = false;

	function handlePointerDown(e, match) {
		if (e.button !== 0) return; // Only left-click
		longPressTriggered = false;
		longPressTimer = setTimeout(() => {
			longPressTriggered = true;
			if (navigator.vibrate) navigator.vibrate(50);
			onMatchLongPress(match);
		}, 600);
	}

	function handlePointerUp(e, match) {
		if (e.button !== 0) return; // Only left-click
		clearTimeout(longPressTimer);
		if (!longPressTriggered) {
			onMatchClick(match);
		}
	}

	function handlePointerLeave() {
		clearTimeout(longPressTimer);
	}
</script>

<section class="mb-6">
	<div class="flex items-center justify-between mb-3">
		<div class="flex items-center gap-3">
			<h3 class="text-sm md:text-base font-black text-orange-400 uppercase tracking-widest">Event Progress</h3>
			{#if hasOverrides}
				<button
					on:click={onClearOverrides}
					class="px-2.5 py-1 rounded-full text-[7px] md:text-[8px] font-black uppercase tracking-widest bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
				>
					Clear Overrides
				</button>
			{/if}
		</div>
		<div class="flex items-center gap-2 md:gap-3 text-[6px] md:text-[8px] font-black uppercase tracking-widest flex-wrap justify-end">
			<span class="flex items-center gap-1"><span class="w-2 h-2 md:w-2.5 md:h-2.5 rounded-sm bg-red-500/50"></span><span class="text-zinc-500">Red Won</span></span>
			<span class="flex items-center gap-1"><span class="w-2 h-2 md:w-2.5 md:h-2.5 rounded-sm bg-blue-500/50"></span><span class="text-zinc-500">Blue Won</span></span>
			<span class="flex items-center gap-1"><span class="w-2 h-2 md:w-2.5 md:h-2.5 rounded-sm bg-red-500"></span><span class="text-zinc-500">Red Fav</span></span>
			<span class="flex items-center gap-1"><span class="w-2 h-2 md:w-2.5 md:h-2.5 rounded-sm bg-blue-500"></span><span class="text-zinc-500">Blue Fav</span></span>
			<span class="flex items-center gap-1"><span class="w-2 h-2 md:w-2.5 md:h-2.5 rounded-sm bg-zinc-400/30 border border-zinc-400/50"></span><span class="text-zinc-500">Toss-up</span></span>
			<span class="flex items-center gap-1"><span class="w-2 h-2 md:w-2.5 md:h-2.5 rounded-sm bg-zinc-500 ring-1 ring-yellow-400/60"></span><span class="text-zinc-500">Override</span></span>
		</div>
	</div>
	<p class="text-[8px] text-zinc-600 mb-2">Tap to view match. Long-press future match to set what-if override.</p>
	<div class="flex flex-wrap gap-1">
		{#each matchCards as { match, pred, cardClass } (match.match_number)}
			<div class="relative">
				<button
					class="w-8 h-8 rounded-lg border text-[10px] font-black text-white/80 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:z-10 {cardClass} {hoveredMatch === match ? 'ring-2 ring-white/50 scale-110 z-10' : ''}"
					on:pointerdown={(e) => handlePointerDown(e, match)}
					on:pointerup={(e) => handlePointerUp(e, match)}
					on:pointerleave={handlePointerLeave}
					on:contextmenu|preventDefault={(e) => onMatchContextMenu(e, match)}
					on:mouseenter={() => onMatchHover(match)}
					on:mouseleave={() => { onMatchHoverEnd(); }}
				>
					{match.match_number}
				</button>
				{#if hoveredMatch === match}
					<div class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-xl min-w-[200px] pointer-events-none">
						<p class="text-[10px] font-black text-white mb-2">Match {match.match_number}</p>
						<div class="grid grid-cols-2 gap-2 text-[8px]">
							<div>
								<p class="font-black text-red-500 mb-1">Red</p>
								{#each match.alliances.red.team_keys as key}
									<p class="text-zinc-400">{key.replace('frc','')}</p>
								{/each}
							</div>
							<div>
								<p class="font-black text-blue-500 mb-1">Blue</p>
								{#each match.alliances.blue.team_keys as key}
									<p class="text-zinc-400">{key.replace('frc','')}</p>
								{/each}
							</div>
						</div>
						{#if getTooltipText(pred)}
							<p class="text-[9px] font-bold text-zinc-300 mt-2 pt-2 border-t border-zinc-800 text-center">
								{getTooltipText(pred)}
							</p>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</section>
