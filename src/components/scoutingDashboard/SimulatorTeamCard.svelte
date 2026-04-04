<script>
	export let team;
	export let teamIndex;
	export let alliance = 'red'; // 'red' or 'blue'
	export let getTeamSummary;
	export let teamColorsMap;
	export let teamDetailsMap;
	export let onTeamInput;
	export let onTeamClick;
	export let onImageClick;
	export let getDriveDirectLink;
	export let getVal;
	export let allTeamsList = [];
	export let readOnly = false;
	export let teamMediaMap = new Map();
	export let teamImageIndices = new Map();
	export let onImageCycle = () => {};

	$: summary = getTeamSummary(team);
	$: colors = teamColorsMap?.get(team) || { primary: alliance === 'red' ? '#ef4444' : '#3b82f6', secondary: alliance === 'red' ? '#991b1b' : '#1e3a8a' };

	$: images = (() => {
		if (!team) return [];
		const pitImg = summary?.pit ? getDriveDirectLink(getVal(summary.pit, 'Bot pic')) : null;
		const tbaImages = teamMediaMap?.get(team) || [];
		const imgs = [];
		if (pitImg) imgs.push(pitImg);
		tbaImages.forEach(img => {
			if (img !== pitImg) imgs.push(img);
		});
		return imgs;
	})();
	$: currentIdx = teamImageIndices?.get(team) || 0;
	$: currentImg = images[currentIdx];

	const borderColor = alliance === 'red' ? 'border-red-500/30' : 'border-blue-500/30';
	const hoverBorder = alliance === 'red' ? 'hover:border-red-500' : 'hover:border-blue-500';

	let inputValue = team || '';
	let showSuggestions = false;

	$: suggestions = inputValue.length > 0 
		? allTeamsList
			.map(t => ({ num: t, nickname: teamDetailsMap?.get(t)?.nickname || '' }))
			.filter(t => t.num.includes(inputValue) || t.nickname.toLowerCase().includes(inputValue.toLowerCase()))
			.slice(0, 5)
		: [];

	function selectTeam(tNum) {
		onTeamInput(teamIndex, tNum);
		inputValue = tNum;
		showSuggestions = false;
	}

	function handleKeydown(e) {
		if (e.key === 'Enter') {
			if (suggestions.length > 0 && inputValue !== suggestions[0].num) {
				selectTeam(suggestions[0].num);
			} else {
				selectTeam(inputValue);
			}
		}
	}
</script>

{#if summary}
	<div
		class="bg-zinc-900/60 rounded-2xl border-2 {borderColor} {hoverBorder} p-4 md:p-5 transition-all group cursor-pointer overflow-hidden relative"
		style="--team-primary: {colors.primary}; --team-secondary: {colors.secondary}"
		role="button"
		tabindex="0"
		on:click={() => onTeamClick(team)}
		on:keydown={(e) => e.key === 'Enter' && onTeamClick(team)}>
  <!-- clear team button -->
  {#if !readOnly}
  <button
    class="absolute top-1 right-1 w-12 h-12 rounded-full bg-black/50 text-white text-lg flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity z-20"
    on:click|stopPropagation={() => {
    onTeamInput(teamIndex, ''); inputValue = '';
    }}
    on:keydown={(e) => {if(e.key === 'Enter'){ onTeamInput(teamIndex, ''); inputValue = ''; }}}
    aria-label="Clear team selection">
    &times;
  </button>
  {/if}

		<!-- Header: Team number and nickname -->
		<div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3 relative z-10">
			<div class="flex-1">
				<div class="flex items-center gap-2 flex-wrap">
					<span class="text-xl md:text-2xl font-black text-white group-hover:text-[var(--team-primary)] transition-colors">{team}</span>
					<span class="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest">
						{teamDetailsMap?.get(team)?.nickname || ''}
					</span>
				</div>
			</div>
			<!-- Bot Picture -->
			{#if currentImg}
				<div
					class="w-20 h-20 md:w-24 md:h-24 rounded-lg md:rounded-xl overflow-hidden border-2 border-white/10 shadow-lg bg-black/40 cursor-zoom-in hover:border-[var(--team-primary)] transition-all flex-shrink-0 relative group/img"
					role="button"
					tabindex="0"
					on:click|stopPropagation={() => onImageClick(currentImg)}
					on:keydown={(e) => e.key === 'Enter' && onImageClick(currentImg)}>
					<img src={currentImg} alt="Bot" class="w-full h-full object-contain" />
					
					{#if images.length > 1}
						<button 
							class="absolute bottom-1 right-1 bg-black/80 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full border border-white/10 opacity-0 group-hover/img:opacity-100 transition-opacity z-20"
							on:click|stopPropagation={() => onImageCycle(team)}>
							{currentIdx + 1}/{images.length} ↻
						</button>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Key Metrics Grid -->
		<div class="grid grid-cols-3 gap-2 md:gap-3 mb-3 relative z-10">
			<div class="bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-2.5 md:p-3 rounded-lg md:rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition">
				<p class="text-[7px] md:text-[8px] font-black text-blue-400 uppercase tracking-tight mb-0.5">EPA</p>
				<p class="font-black text-white text-sm md:text-base">{summary.epa.toFixed(1)}</p>
			</div>
			<div class="bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-2.5 md:p-3 rounded-lg md:rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition">
				<p class="text-[7px] md:text-[8px] font-black text-orange-400 uppercase tracking-tight mb-0.5">OPR</p>
				<p class="font-black text-white text-sm md:text-base">{summary.opr.toFixed(1)}</p>
			</div>
			<div class="bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-2.5 md:p-3 rounded-lg md:rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition">
				<p class="text-[7px] md:text-[8px] font-black text-purple-400 uppercase tracking-tight mb-0.5">Climb %</p>
				<p class="font-black text-white text-sm md:text-base">{(summary.climbRate * 100).toFixed(0)}%</p>
			</div>
		</div>

		<!-- Secondary Metrics -->
		<div class="grid grid-cols-3 gap-2 md:gap-3 mb-3 relative z-10">
			<div class="bg-black/40 p-2 md:p-2.5 rounded-lg border border-white/5">
				<p class="text-[7px] md:text-[8px] font-black text-zinc-400 uppercase tracking-tight mb-0.5">Avg Eff</p>
				<p class="font-black text-green-400 text-xs md:text-sm">{summary.avgEff.toFixed(1)}</p>
			</div>
			<div class="bg-black/40 p-2 md:p-2.5 rounded-lg border border-white/5">
				<p class="text-[7px] md:text-[8px] font-black text-zinc-400 uppercase tracking-tight mb-0.5">Matches</p>
				<p class="font-black text-cyan-400 text-xs md:text-sm">{summary.entryCount}</p>
			</div>
			<div class="bg-black/40 p-2 md:p-2.5 rounded-lg border border-white/5">
				<p class="text-[7px] md:text-[8px] font-black text-zinc-400 uppercase tracking-tight mb-0.5">Location</p>
				<p class="font-black text-zinc-300 text-[10px] md:text-xs truncate">{teamDetailsMap?.get(team)?.city || 'N/A'}</p>
			</div>
		</div>

		<!-- Pit Scouting Details -->
		{#if summary.pit}
			<div class="grid grid-cols-2 gap-2 md:gap-3 relative z-10">
				<div class="bg-black/40 p-2 rounded-lg md:rounded-xl border border-white/5 text-[7px] md:text-[8px]">
					<p class="font-black text-zinc-500 uppercase mb-0.5">Drivetrain</p>
					<p class="font-black text-white truncate">{getVal(summary.pit, 'Drive Train Type')}</p>
				</div>
				<div class="bg-black/40 p-2 rounded-lg md:rounded-xl border border-white/5 text-[7px] md:text-[8px]">
					<p class="font-black text-zinc-500 uppercase mb-0.5">Best Auto</p>
					<p class="font-black text-zinc-300 truncate italic">"{getVal(summary.pit, 'Best Auto')}"</p>
				</div>
				<div class="bg-black/40 p-2 rounded-lg md:rounded-xl border border-white/5 text-[7px] md:text-[8px]">
					<p class="font-black text-zinc-500 uppercase mb-0.5">Drive Coach</p>
					<p class="font-black text-white truncate">{getVal(summary.pit, 'Drive Coach')}</p>
				</div>
				<div class="bg-black/40 p-2 rounded-lg md:rounded-xl border border-white/5 text-[7px] md:text-[8px]">
					<p class="font-black text-zinc-500 uppercase mb-0.5">Friendliness</p>
					<p class="font-black text-white truncate">{getVal(summary.pit, 'Team Friendliness')}</p>
				</div>
				{#if getVal(summary.pit, 'Abilities')}
					<div class="bg-black/40 p-2 rounded-lg md:rounded-xl border border-white/5 text-[7px] md:text-[8px] col-span-2">
						<p class="font-black text-zinc-500 uppercase mb-0.5">Abilities</p>
						<p class="font-black text-zinc-300 line-clamp-2 text-[6px] md:text-[7px]">{getVal(summary.pit, 'Abilities')}</p>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Last Comments (if available) -->
		{#if summary.lastComments}
			<div class="mt-3 pt-3 border-t border-zinc-700 relative z-10">
				<p class="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase mb-1">Last Match Notes</p>
				<p class="text-[8px] md:text-[9px] font-medium text-zinc-300 line-clamp-2 italic">"{summary.lastComments}"</p>
			</div>
		{/if}

		<div class="absolute -right-2 -bottom-2 opacity-5 pointer-events-none text-2xl md:text-6xl font-black italic">{team}</div>
	</div>
{:else if !readOnly}
	<div class="relative w-full">
		<div class="flex gap-2">
			<input
				type="text"
				bind:value={inputValue}
				on:keydown={handleKeydown}
				on:focus={() => showSuggestions = true}
				on:blur={() => setTimeout(() => showSuggestions = false, 200)}
				placeholder="Team # or Name"
				class="w-full bg-black/60 border-2 {alliance === 'red'
					? 'border-red-500/30 focus:border-red-500'
					: 'border-blue-500/30 focus:border-blue-500'} rounded-xl p-3 text-center font-black text-base md:text-lg outline-none transition"
			/>
			<button 
				on:click={() => selectTeam(inputValue)}
				class="px-4 rounded-xl font-black uppercase tracking-widest transition border-2 {alliance === 'red' ? 'bg-red-600 border-red-500 hover:bg-red-500' : 'bg-blue-600 border-blue-500 hover:bg-blue-500'} text-white shadow-lg active:scale-95">
				Select
			</button>
		</div>

		{#if showSuggestions && suggestions.length > 0}
			<div class="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border-2 border-zinc-800 rounded-xl shadow-2xl z-[100] overflow-hidden">
				{#each suggestions as suggestion}
					<button 
						on:click|preventDefault={() => selectTeam(suggestion.num)}
						class="w-full p-3 text-left hover:bg-white/5 transition flex justify-between items-center border-b border-zinc-800 last:border-0">
						<div>
							<span class="font-black text-white mr-2">{suggestion.num}</span>
							<span class="text-[10px] font-bold text-zinc-500 uppercase">{suggestion.nickname}</span>
						</div>
						<svg class="w-4 h-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" />
						</svg>
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/if}
