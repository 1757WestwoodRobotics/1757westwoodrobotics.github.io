<script>
	export let match;
	export let hoveredMatch;
	export let getScouterCount;
	export let getMatchBreakdown;
	export let teamIsInMatch;
	export let searchTerm;
	export let onMatchClick;
	export let onMatchLongPress;
	export let onMatchContextMenu;
	export let onMatchHover;
	export let onMatchHoverEnd;

	$: searchTeamNum = searchTerm.trim() ? parseInt(searchTerm.trim()) : null;
	$: count = getScouterCount(match.match_number);
	$: teamInMatch = searchTeamNum && teamIsInMatch(searchTeamNum, match);

	let pressTimer;
	let longPressTriggered = false;

	function startPress() {
		longPressTriggered = false;
		pressTimer = setTimeout(() => {
			longPressTriggered = true;
			onMatchLongPress();
			// Provide haptic feedback if supported
			if (window.navigator && window.navigator.vibrate) {
				window.navigator.vibrate(50);
			}
		}, 600);
	}

	function endPress() {
		clearTimeout(pressTimer);
	}

	function handleClick() {
		if (!longPressTriggered) {
			onMatchClick();
		}
	}
</script>

<button
	class="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all border cursor-pointer hover:scale-110 relative {count >= 6
		? 'bg-blue-600 border-blue-400 text-white hover:bg-blue-500'
		: count > 0
			? 'bg-blue-900/40 border-blue-700 text-blue-300 hover:bg-blue-900/60'
			: 'bg-zinc-900 border-zinc-800 text-zinc-700 hover:border-zinc-700'} {teamInMatch
		? 'shadow-[0_0_12px_rgba(34,197,94,0.6),0_0_24px_rgba(34,197,94,0.3)] ring-2 ring-green-500/50'
		: ''}"
	on:mouseenter={() => onMatchHover(match)}
	on:mouseleave={() => onMatchHoverEnd()}
	on:focus={() => onMatchHover(match)}
	on:blur={() => onMatchHoverEnd()}
	on:mousedown={startPress}
	on:mouseup={endPress}
	on:mouseleave={endPress}
	on:touchstart={startPress}
	on:touchend={endPress}
	on:click={handleClick}
	on:contextmenu={(e) => {
		e.preventDefault();
		onMatchContextMenu(e, match);
	}}>
	{match.match_number}
	{#if hoveredMatch === match}
		<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[110] animate-in fade-in zoom-in-95 duration-150">
			<div class="bg-zinc-900 border-2 border-zinc-800 p-4 rounded-2xl shadow-2xl min-w-[200px]">
				<p class="text-[10px] font-black text-white uppercase tracking-widest mb-3 border-b border-zinc-800 pb-2">
					Match {match.match_number} Breakdown
				</p>
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<p class="text-[8px] font-black text-red-500 uppercase tracking-tighter mb-1">Red</p>
						{#each getMatchBreakdown(match).red as t}
							<div class="flex justify-between items-center gap-3">
								<span class="text-[9px] font-bold text-zinc-500">{t.pos}</span>
								<span class="text-[10px] font-black {t.scouted ? 'text-white' : 'text-zinc-700 line-through'}">{t.team}</span>
								<div class="w-1.5 h-1.5 rounded-full {t.scouted ? 'bg-green-500' : 'bg-red-900'}"></div>
							</div>
						{/each}
					</div>
					<div class="space-y-1.5">
						<p class="text-[8px] font-black text-blue-500 uppercase tracking-tighter mb-1">Blue</p>
						{#each getMatchBreakdown(match).blue as t}
							<div class="flex justify-between items-center gap-3">
								<span class="text-[9px] font-bold text-zinc-500">{t.pos}</span>
								<span class="text-[10px] font-black {t.scouted ? 'text-white' : 'text-zinc-700 line-through'}">{t.team}</span>
								<div class="w-1.5 h-1.5 rounded-full {t.scouted ? 'bg-green-500' : 'bg-red-900'}"></div>
							</div>
						{/each}
					</div>
				</div>
			</div>
			<div class="w-2 h-2 bg-zinc-900 border-r-2 border-b-2 border-zinc-800 rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2"></div>
		</div>
	{/if}
</button>
