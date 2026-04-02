<script>
	export let alliance = 'red';
	export let predictions = { rp1: 'muted', rp2: 'muted', rp3: 'muted', win: 'muted', reasons: {} };

	const isRed = alliance === 'red';

	const cards = [
		{ key: 'rp1', label: 'Energized', icon: 'energized' },
		{ key: 'rp2', label: 'Supercharged', icon: 'supercharged' },
		{ key: 'rp3', label: 'Traversal', icon: 'traversal' },
		{ key: 'win', label: 'Win', icon: 'trophy' },
		{ key: 'win', label: 'Win', icon: 'trophy' },
		{ key: 'win', label: 'Win', icon: 'trophy' }
	];

	let hoveredCard = null;

	function getCardClasses(state) {
		if (state === 'lit') {
			return isRed
				? 'bg-red-500 border-red-400 shadow-lg shadow-red-500/30'
				: 'bg-blue-500 border-blue-400 shadow-lg shadow-blue-500/30';
		}
		if (state === 'contention') {
			return isRed
				? 'bg-red-500/30 border-red-500/50'
				: 'bg-blue-500/30 border-blue-500/50';
		}
		return 'bg-zinc-800 border-zinc-700';
	}

	function getIconOpacity(state) {
		if (state === 'lit') return 'opacity-100';
		if (state === 'contention') return 'opacity-50';
		return 'opacity-20';
	}
</script>

<div class="grid grid-cols-6 gap-1.5 md:gap-2 mb-4 md:mb-6">
	{#each cards as card, i}
		{@const state = predictions[card.key]}
		{@const reason = predictions.reasons?.[card.key]}
		{@const isWinDuplicate = card.key === 'win' && i > 3}
		<div
			class="relative aspect-square rounded-lg md:rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-500 cursor-default {getCardClasses(state)}"
			on:mouseenter={() => { if (!isWinDuplicate) hoveredCard = i; }}
			on:mouseleave={() => hoveredCard = null}
		>
			<svg class="w-5 h-5 md:w-7 md:h-7 text-white {getIconOpacity(state)} transition-opacity duration-500"
				 viewBox="0 0 24 24" fill="currentColor">
				{#if card.icon === 'energized'}
					<circle cx="12" cy="12" r="5" />
				{:else if card.icon === 'supercharged'}
					<circle cx="12" cy="5" r="2.5" />
					<circle cx="8" cy="11" r="2.5" />
					<circle cx="16" cy="11" r="2.5" />
					<circle cx="5" cy="17" r="2.5" />
					<circle cx="12" cy="17" r="2.5" />
					<circle cx="19" cy="17" r="2.5" />
				{:else if card.icon === 'traversal'}
					<rect x="4" y="3" width="3" height="4" rx="0.5" />
					<rect x="10.5" y="3" width="3" height="4" rx="0.5" />
					<rect x="17" y="3" width="3" height="4" rx="0.5" />
					<rect x="3" y="7" width="18" height="3" rx="0.5" />
					<rect x="6" y="10" width="12" height="11" rx="0.5" />
					<rect x="9.5" y="15" width="5" height="6" rx="0.5" />
				{:else if card.icon === 'trophy'}
					<path d="M7 4h10v1h3v3c0 1.5-1 2.5-2.5 3H17c-.5 2-2 3.5-4 4v2h3v2H8v-2h3v-2c-2-.5-3.5-2-4-4h-.5C5 11.5 4 10.5 4 9V6h3V4z" />
				{/if}
			</svg>
			<span class="text-[5px] md:text-[7px] font-black text-white uppercase tracking-tight mt-0.5 {getIconOpacity(state)} transition-opacity duration-500">
				{card.label}
			</span>

			{#if hoveredCard === i && reason}
				<div class="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-xl min-w-[160px] pointer-events-none">
					<p class="text-[10px] font-black text-white mb-1.5">{card.label} {card.key !== 'win' ? '(RP)' : ''}</p>
					{#if card.key !== 'win' && reason.teams}
						{#each reason.teams as entry}
							<div class="flex justify-between text-[9px] mb-0.5">
								<span class="text-zinc-400">{entry.team || '—'}</span>
								<span class="text-zinc-300 font-bold">{entry.value.toFixed(2)}</span>
							</div>
						{/each}
						<div class="flex justify-between text-[9px] mt-1.5 pt-1.5 border-t border-zinc-700">
							<span class="text-zinc-300 font-black">Sum</span>
							<span class="text-white font-black">{reason.sum.toFixed(2)}</span>
						</div>
						<p class="text-[8px] font-bold mt-1 {state === 'lit' ? 'text-green-400' : state === 'contention' ? 'text-yellow-400' : 'text-zinc-500'}">{reason.label}</p>
					{:else if card.key === 'win'}
						<p class="text-[9px] text-zinc-300 font-bold">{(reason.winProb * 100).toFixed(1)}%</p>
						<p class="text-[8px] font-bold mt-1 {state === 'lit' ? 'text-green-400' : state === 'muted' ? 'text-zinc-500' : 'text-yellow-400'}">{reason.label}</p>
					{/if}
				</div>
			{/if}
		</div>
	{/each}
</div>
