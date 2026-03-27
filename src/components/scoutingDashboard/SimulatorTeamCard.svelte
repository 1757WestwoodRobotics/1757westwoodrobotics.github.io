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

	$: summary = getTeamSummary(team);
	$: colors = teamColorsMap?.get(team) || { primary: alliance === 'red' ? '#ef4444' : '#3b82f6', secondary: alliance === 'red' ? '#991b1b' : '#1e3a8a' };

	const borderColor = alliance === 'red' ? 'border-red-500/30' : 'border-blue-500/30';
	const hoverBorder = alliance === 'red' ? 'hover:border-red-500' : 'hover:border-blue-500';

	let showDetails = false;
</script>

{#if summary}
	<div
		class="bg-zinc-900/60 rounded-2xl border-2 {borderColor} {hoverBorder} p-4 md:p-5 transition-all group cursor-pointer overflow-hidden relative"
		style="--team-primary: {colors.primary}; --team-secondary: {colors.secondary}"
		role="button"
		tabindex="0"
		on:click={() => onTeamClick(team)}
		on:keydown={(e) => e.key === 'Enter' && onTeamClick(team)}>

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
			{#if summary.pit && getDriveDirectLink(getVal(summary.pit, 'Bot pic'))}
				<div
					class="w-20 h-20 md:w-24 md:h-24 rounded-lg md:rounded-xl overflow-hidden border-2 border-white/10 shadow-lg bg-black/40 cursor-zoom-in hover:border-[var(--team-primary)] transition-all flex-shrink-0"
					role="button"
					tabindex="0"
					on:click|stopPropagation={() => onImageClick(getDriveDirectLink(getVal(summary.pit, 'Bot pic')))}
					on:keydown={(e) => e.key === 'Enter' && onImageClick(getDriveDirectLink(getVal(summary.pit, 'Bot pic')))}>
					<img src={getDriveDirectLink(getVal(summary.pit, 'Bot pic'))} alt="Bot" class="w-full h-full object-contain" />
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
{:else}
	<input
		type="text"
		value={team}
		on:input={(e) => onTeamInput(teamIndex, e.target.value)}
		placeholder="Team #"
		class="w-full bg-black/60 border-2 {alliance === 'red'
			? 'border-red-500/30 focus:border-red-500'
			: 'border-blue-500/30 focus:border-blue-500'} rounded-xl p-3 text-center font-black text-base md:text-lg outline-none transition"
	/>
{/if}
