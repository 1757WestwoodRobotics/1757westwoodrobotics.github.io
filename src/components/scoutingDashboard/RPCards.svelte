<script>
	export let alliance = 'red';
	export let predictions = { rp1: 'muted', rp2: 'muted', rp3: 'muted', win: 'muted' };

	const isRed = alliance === 'red';

	const cards = [
		{ key: 'rp1', label: 'Energized', icon: 'energized' },
		{ key: 'rp2', label: 'Supercharged', icon: 'supercharged' },
		{ key: 'rp3', label: 'Traversal', icon: 'traversal' },
		{ key: 'win', label: 'Win', icon: 'trophy' },
		{ key: 'win', label: 'Win', icon: 'trophy' },
		{ key: 'win', label: 'Win', icon: 'trophy' }
	];

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
	{#each cards as card}
		{@const state = predictions[card.key]}
		<div
			class="aspect-square rounded-lg md:rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-500 {getCardClasses(state)}"
			title="{card.label} RP"
		>
			<svg class="w-5 h-5 md:w-7 md:h-7 text-white {getIconOpacity(state)} transition-opacity duration-500"
				 viewBox="0 0 24 24" fill="currentColor">
				{#if card.icon === 'energized'}
					<!-- Single circle -->
					<circle cx="12" cy="12" r="5" />
				{:else if card.icon === 'supercharged'}
					<!-- Pyramid of 6 circles -->
					<circle cx="12" cy="5" r="2.5" />
					<circle cx="8" cy="11" r="2.5" />
					<circle cx="16" cy="11" r="2.5" />
					<circle cx="5" cy="17" r="2.5" />
					<circle cx="12" cy="17" r="2.5" />
					<circle cx="19" cy="17" r="2.5" />
				{:else if card.icon === 'traversal'}
					<!-- Castle / tower -->
					<rect x="4" y="3" width="3" height="4" rx="0.5" />
					<rect x="10.5" y="3" width="3" height="4" rx="0.5" />
					<rect x="17" y="3" width="3" height="4" rx="0.5" />
					<rect x="3" y="7" width="18" height="3" rx="0.5" />
					<rect x="6" y="10" width="12" height="11" rx="0.5" />
					<rect x="9.5" y="15" width="5" height="6" rx="0.5" />
				{:else if card.icon === 'trophy'}
					<!-- Trophy -->
					<path d="M7 4h10v1h3v3c0 1.5-1 2.5-2.5 3H17c-.5 2-2 3.5-4 4v2h3v2H8v-2h3v-2c-2-.5-3.5-2-4-4h-.5C5 11.5 4 10.5 4 9V6h3V4z" />
				{/if}
			</svg>
			<span class="text-[5px] md:text-[7px] font-black text-white uppercase tracking-tight mt-0.5 {getIconOpacity(state)} transition-opacity duration-500">
				{card.label}
			</span>
		</div>
	{/each}
</div>
