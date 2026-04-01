<script>
	export let bracketMatches = [];
	export let alliances = [];
	export let playoffOverrides = new Map();
	export let hasOverrides = false;
	export let onMatchClick = () => {};
	export let onMatchLongPress = () => {};
	export let onClearOverrides = () => {};

	let hoveredMatch = null;

	$: matchCards = bracketMatches.map(m => {
		let cardClass = 'bg-zinc-800 border-zinc-700';
		if (m.played) {
			// Played: muted color based on which side won
			cardClass = m.winner === m.a1
				? 'bg-red-500/50 border-red-500/40'
				: 'bg-blue-500/50 border-blue-500/40';
		} else if (m.override) {
			// Override: bright color of override winner + yellow ring
			cardClass = m.override === 'a1'
				? 'bg-red-500 border-yellow-400 ring-2 ring-yellow-400 shadow-md shadow-yellow-400/40'
				: 'bg-blue-500 border-yellow-400 ring-2 ring-yellow-400 shadow-md shadow-yellow-400/40';
		} else {
			// Prediction: color based on EPA win probability
			const winProb = m.winProb;
			if (winProb > 0.625) {
				cardClass = 'bg-red-500 border-red-400 shadow-sm shadow-red-500/20';
			} else if (winProb < 0.375) {
				cardClass = 'bg-blue-500 border-blue-400 shadow-sm shadow-blue-500/20';
			} else {
				cardClass = 'bg-zinc-400/30 border-zinc-400/50';
			}
		}
		return { m, cardClass };
	});

	function getTooltipText(m) {
		if (!m) return '';
		const a1Num = alliances.indexOf(m.a1) + 1;
		const a2Num = alliances.indexOf(m.a2) + 1;
		if (m.played) {
			return `A${a1Num} ${m.redScore} - ${m.blueScore} A${a2Num}`;
		}
		let text = `A${a1Num} vs A${a2Num}`;
		if (m.winProb !== undefined) {
			const pct = (Math.max(m.winProb, 1 - m.winProb) * 100).toFixed(0);
			text += ` (${pct}%)`;
		}
		if (m.override) text += ' [Override]';
		return text;
	}

	let longPressTimer;
	let longPressTriggered = false;

	function handlePointerDown(m) {
		longPressTriggered = false;
		longPressTimer = setTimeout(() => {
			longPressTriggered = true;
			if (navigator.vibrate) navigator.vibrate(50);
			onMatchLongPress(m);
		}, 600);
	}

	function handlePointerUp(m) {
		clearTimeout(longPressTimer);
		if (!longPressTriggered) {
			onMatchClick(m);
		}
	}

	function handlePointerLeave() {
		clearTimeout(longPressTimer);
	}
</script>

<section class="mb-6">
	<div class="flex items-center justify-between mb-3">
		<div class="flex items-center gap-3">
			<h3 class="text-sm md:text-base font-black text-orange-400 uppercase tracking-widest">Playoff Progress</h3>
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
	<p class="text-[8px] text-zinc-600 mb-2">Tap to load into simulator. Long-press or right-click future match to set what-if override.</p>
	<div class="flex flex-wrap gap-1">
		{#each matchCards as { m, cardClass } (m.label)}
			<div class="relative">
				<button
					class="w-8 h-8 rounded-lg border text-[10px] font-black text-white/80 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:z-10 {cardClass} {hoveredMatch === m ? 'ring-2 ring-white/50 scale-110 z-10' : ''}"
					on:pointerdown={() => handlePointerDown(m)}
					on:pointerup={() => handlePointerUp(m)}
					on:pointerleave={handlePointerLeave}
					on:contextmenu|preventDefault={() => { if (!m.played) onMatchLongPress(m); }}
					on:mouseenter={() => hoveredMatch = m}
					on:mouseleave={() => hoveredMatch = null}
				>
					{m.label.replace('M', '')}
				</button>
				{#if hoveredMatch === m}
					<div class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-xl min-w-[180px] pointer-events-none">
						<p class="text-[10px] font-black text-white mb-1">{m.label}</p>
						<p class="text-[9px] text-zinc-400">{getTooltipText(m)}</p>
						{#if m.a1?.captain}
							<div class="grid grid-cols-2 gap-2 text-[8px] mt-2">
								<div>
									<p class="font-black text-zinc-300 mb-0.5">A{alliances.indexOf(m.a1) + 1}</p>
									<p class="text-zinc-500">{m.a1.captain}</p>
									{#each m.a1.picks || [] as p}<p class="text-zinc-500">{p}</p>{/each}
								</div>
								<div>
									<p class="font-black text-zinc-300 mb-0.5">A{alliances.indexOf(m.a2) + 1}</p>
									<p class="text-zinc-500">{m.a2.captain}</p>
									{#each m.a2.picks || [] as p}<p class="text-zinc-500">{p}</p>{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</section>
